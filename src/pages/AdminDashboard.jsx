import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';
import { useFeedback } from '../components/Feedback';
import { toISO, formatDate, classRange, to12h } from '../utils/tutor';
import { fetchFeeSettings, effectiveFee, takeHome } from '../utils/fees';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_DOT = { completed: '#12814B', confirmed: '#6D4AFF', pending: '#FFB020', cancelled: '#C2410C' };
const rupee = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const tutorStatus = (t) => (t.isSuspended ? ['Suspended', 'pill-danger'] : t.isVerified ? ['Active', 'pill-success'] : ['Pending', 'pill-warning']);

function AdminDashboard() {
  const { userData } = useAuth();
  const { toast, confirm } = useFeedback();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [metric, setMetric] = useState('revenue');
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState('');
  const [tutorFilter, setTutorFilter] = useState('all');
  const [feeSettings, setFeeSettings] = useState({ commissionRate: 5 });
  const [feeEdit, setFeeEdit] = useState(null); // { rate, from }

  const fetchData = async () => {
    setLoading(true);
    try {
      const uSnap = await getDocs(query(collection(db, 'users')));
      const uRes = []; uSnap.forEach((d) => uRes.push({ id: d.id, ...d.data() }));
      setUsers(uRes);
      const bSnap = await getDocs(query(collection(db, 'bookings')));
      const bRes = []; bSnap.forEach((d) => bRes.push({ id: d.id, ...d.data() }));
      setBookings(bRes);
      setFeeSettings(await fetchFeeSettings());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast('Failed to load admin data.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userData && userData.role !== 'admin') navigate('/dashboard');
    else if (userData?.role === 'admin') fetchData();
  }, [userData, navigate]);

  // ---------- actions ----------
  const act = async (fn, okMsg, errMsg) => {
    try { await fn(); toast(okMsg); await fetchData(); setSelectedUser(null); }
    catch (err) { console.error(err); toast(errMsg, 'error'); }
  };

  const handleApprove = (u) => act(() => updateDoc(doc(db, 'users', u.id), { isVerified: true, isSuspended: false }), `${u.name} approved`, 'Failed to approve user.');

  const handleSuspend = async (u, suspend) => {
    const ok = await confirm({ tone: suspend ? 'warning' : 'neutral', icon: suspend ? 'ri-pause-circle-line' : 'ri-play-circle-line', title: `${suspend ? 'Suspend' : 'Reactivate'} ${u.name}?`, message: suspend ? 'They will be hidden from search and cannot take new bookings.' : 'They will appear in search again.', confirmText: suspend ? 'Suspend' : 'Reactivate' });
    if (ok) act(() => updateDoc(doc(db, 'users', u.id), { isSuspended: suspend }), suspend ? 'User suspended' : 'User reactivated', 'Failed to update user.');
  };

  const handleToggleAdmin = async (u, makeAdmin) => {
    const ok = await confirm({ icon: 'ri-shield-star-line', title: makeAdmin ? `Promote ${u.name} to Admin?` : `Remove admin access for ${u.name}?`, message: makeAdmin ? 'Admins can approve tutors, suspend users and change the platform fee.' : 'They will become a parent account.', confirmText: makeAdmin ? 'Promote' : 'Demote' });
    if (ok) act(() => updateDoc(doc(db, 'users', u.id), { role: makeAdmin ? 'admin' : 'parent' }), makeAdmin ? 'Promoted to admin' : 'Admin access removed', 'Failed to change user role.');
  };

  const handleRemove = async (u) => {
    const ok = await confirm({ tone: 'danger', title: `Delete ${u.name}?`, message: 'This permanently removes the user. It cannot be undone.', cancelText: 'Keep user', confirmText: 'Delete' });
    if (ok) act(() => deleteDoc(doc(db, 'users', u.id)), 'User deleted', 'Failed to remove user.');
  };

  const handleSignOut = async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    try { await signOut(auth); navigate('/'); } catch (err) { console.error(err); }
  };

  // ---------- platform fee (FC: inline edit + typed confirm + start date) ----------
  const todayISO = toISO(new Date());
  const currentFee = effectiveFee(feeSettings);
  const scheduled = feeSettings.nextRate != null && feeSettings.nextRateFrom && feeSettings.nextRateFrom > todayISO ? feeSettings : null;

  const saveFee = async () => {
    const rate = Number(feeEdit.rate);
    if (isNaN(rate) || rate < 0 || rate > 30) { toast('Enter a fee between 0 and 30%.', 'warning'); return; }
    const from = feeEdit.from || todayISO;
    if (from < todayISO) { toast('Start date cannot be in the past.', 'warning'); return; }
    const startsNow = from <= todayISO;
    const typed = await confirm({
      icon: 'ri-percent-line', tone: 'warning',
      title: 'Confirm new platform fee',
      message: `You're changing the fee from ${currentFee}% to ${rate}% for all tutors.`,
      body: (
        <div className="dlg-compare">
          <div className="new"><small>STARTS</small><b style={{ fontSize: '1.1rem' }}>{startsNow ? 'Immediately' : formatDate(from)}</b></div>
          <div><small>{startsNow ? '₹600/HR TUTOR KEEPS' : 'UNTIL THEN'}</small><b style={{ fontSize: '1.1rem' }}>{startsNow ? `₹${takeHome(600, rate)}` : `${currentFee}% stays`}</b></div>
        </div>
      ),
      input: { label: `Type ${rate} to confirm`, mustEqual: String(rate), placeholder: String(rate) },
      confirmText: 'Update fee'
    });
    if (typed === null) return;
    const data = startsNow
      ? { commissionRate: rate, nextRate: null, nextRateFrom: null }
      : { commissionRate: currentFee, nextRate: rate, nextRateFrom: from };
    try {
      await setDoc(doc(db, 'settings', 'platform'), data, { merge: true });
      setFeeSettings(s => ({ ...s, ...data }));
      setFeeEdit(null);
      toast(startsNow ? `Platform fee is now ${rate}%` : `${rate}% scheduled from ${formatDate(from)}`);
    } catch (e) {
      toast('Error updating fee: ' + e.message, 'error');
    }
  };

  const cancelScheduled = async () => {
    const ok = await confirm({ title: 'Cancel the scheduled fee change?', message: `The fee will stay at ${currentFee}%.`, confirmText: 'Cancel change', cancelText: 'Keep it' });
    if (!ok) return;
    try {
      await setDoc(doc(db, 'settings', 'platform'), { commissionRate: currentFee, nextRate: null, nextRateFrom: null }, { merge: true });
      setFeeSettings(s => ({ ...s, commissionRate: currentFee, nextRate: null, nextRateFrom: null }));
      toast('Scheduled change cancelled');
    } catch (e) { toast('Failed: ' + e.message, 'error'); }
  };

  // ---------- derived ----------
  const tutors = users.filter(u => u.role === 'tutor');
  const parents = users.filter(u => u.role === 'parent');
  const admins = users.filter(u => u.role === 'admin');
  const pendingTutors = tutors.filter(t => !t.isVerified && !t.isSuspended);

  const months = useMemo(() => {
    const now = new Date();
    const list = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { key: toISO(d).slice(0, 7), label: MONTHS[d.getMonth()], revenue: 0, hours: 0, bookings: 0 };
    });
    const idx = Object.fromEntries(list.map((m, i) => [m.key, i]));
    bookings.forEach(b => {
      const i = idx[b.date?.slice(0, 7)];
      if (i === undefined) return;
      if (b.status !== 'cancelled') list[i].bookings++;
      if (b.status === 'completed' && b.actualStartTime && b.actualEndTime) {
        const hrs = (new Date(b.actualEndTime) - new Date(b.actualStartTime)) / 3600000;
        const fee = b.commissionRate ?? effectiveFee(feeSettings, b.date);
        list[i].hours += hrs;
        list[i].revenue += hrs * (b.hourlyRate || 0) * (fee / 100);
      }
    });
    return list;
  }, [bookings, feeSettings]);

  const cur = months[5] || { revenue: 0, hours: 0, bookings: 0 };
  const prev = months[4] || { revenue: 0 };
  const trend = prev[metric] ? Math.round(((cur[metric] - prev[metric]) / prev[metric]) * 100) : null;
  const maxVal = Math.max(1, ...months.map(m => m[metric]));
  const fmt = (v) => (metric === 'revenue' ? rupee(v) : metric === 'hours' ? `${v.toFixed(0)} h` : v);
  const completedCount = bookings.filter(b => b.status === 'completed').length;

  const topTutors = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (b.status !== 'completed' || !b.actualStartTime || !b.actualEndTime || b.date?.slice(0, 7) !== cur.key) return;
      map[b.tutorName] = (map[b.tutorName] || 0) + (new Date(b.actualEndTime) - new Date(b.actualStartTime)) / 3600000;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [bookings, cur.key]);

  const feed = [...bookings].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 5);

  const q = search.trim().toLowerCase();
  const match = (u) => !q || [u.name, u.email, u.city, u.studentName].some(v => v?.toLowerCase().includes(q));
  const tutorRows = tutors.filter(match).filter(t => tutorFilter === 'all' ? true : tutorFilter === 'pending' ? !t.isVerified && !t.isSuspended : tutorFilter === 'suspended' ? t.isSuspended : t.isVerified && !t.isSuspended);

  if (loading) return <div className="admin"><div className="spinner-container" style={{ minHeight: '80vh' }}><div className="spinner"></div></div></div>;

  const TABS = [['overview', 'Overview'], ['tutors', 'Tutors', tutors.length], ['parents', 'Parents', parents.length], ['bookings', 'Bookings', bookings.length], ['admins', 'Admins', admins.length], ['settings', 'Settings']];

  const personRow = (u, sub, pill) => (
    <div key={u.id} className="person-row">
      <Avatar user={u} size={48} radius={16} />
      <div><p className="t">{u.name || 'Unnamed'}</p><p className="s">{sub}</p></div>
      <span className="e">{u.email}</span>
      <span>{pill}</span>
      <button className={!u.isVerified && u.role === 'tutor' && !u.isSuspended ? 'btn btn-sm' : 'btn-soft btn-sm'} onClick={() => setSelectedUser(u)}>
        {!u.isVerified && u.role === 'tutor' && !u.isSuspended ? 'Review' : 'View'}
      </button>
    </div>
  );

  return (
    <div className="admin">
      <header className="admin-top">
        <Logo suffix="ADMIN" />
        <div className="admin-tabs">
          {TABS.map(([id, label, count]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); setSearch(''); }}>
              {label}{count !== undefined && <span className="count">{count}</span>}
            </button>
          ))}
        </div>
        <button className="btn-light btn-sm" onClick={handleSignOut}><i className="ri-logout-box-r-line"></i>Sign out</button>
      </header>

      <main className="admin-body">
        {tab === 'overview' && (
          <div className="admin-bento">
            <div className="chart-tile">
              <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <p className="eyebrow">{metric === 'revenue' ? 'Platform revenue' : metric === 'hours' ? 'Tracked hours' : 'Bookings'} · {MONTHS[new Date().getMonth()]}</p>
                  <p className="big-num" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.4rem)' }}>{fmt(cur[metric])}</p>
                  {trend !== null && <p className={trend >= 0 ? 'trend-up' : 'trend-down'}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs {prev.label}</p>}
                </div>
                <div className="seg">
                  {[['revenue', 'Revenue'], ['hours', 'Hours'], ['bookings', 'Bookings']].map(([id, l]) => <button key={id} className={metric === id ? 'active' : ''} onClick={() => setMetric(id)}>{l}</button>)}
                </div>
              </div>
              <div className="chart">
                {months.map((m, i) => <div key={m.key} className={`bar ${i === 5 ? 'now' : ''}`} style={{ height: `${(m[metric] / maxVal) * 100}%` }}><span>{fmt(m[metric])}</span></div>)}
              </div>
              <div className="chart-labels">{months.map(m => <span key={m.key}>{m.label}</span>)}</div>
              <div className="mini-stats">
                <div className="tile-lilac"><p style={{ color: 'var(--lilac-ink)' }}>Active tutors</p><b>{tutors.filter(t => t.isVerified && !t.isSuspended).length}</b></div>
                <div className="tile-sky"><p style={{ color: 'var(--sky-ink)' }}>Students</p><b>{parents.length}</b></div>
                <div className="tile-mint"><p style={{ color: 'var(--mint-ink)' }}>Completed classes</p><b>{completedCount}</b></div>
              </div>
            </div>

            <div className="tile tile-peach">
              <div className="row-between" style={{ marginBottom: 10 }}><p className="eyebrow" style={{ margin: 0 }}>Needs action</p><span className="step-num" style={{ width: 30, height: 30, margin: 0, fontSize: '0.8rem' }}>{pendingTutors.length}</span></div>
              {pendingTutors.length === 0 ? <p style={{ fontWeight: 600 }}>No tutors waiting for approval.</p> : pendingTutors.slice(0, 3).map(t => (
                <div key={t.id} className="queue-item">
                  <Avatar user={t} size={38} radius={13} />
                  <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '0.9rem' }}>{t.name}</p><p style={{ fontSize: '0.72rem', fontWeight: 600 }}>{t.subjects?.[0] || 'Tutor'}{t.city ? ` · ${t.city}` : ''}</p></div>
                  <button className="btn btn-sm" style={{ height: 34 }} onClick={() => setSelectedUser(t)}>Review</button>
                </div>
              ))}
            </div>

            <div className="tile tile-butter">
              <p className="eyebrow" style={{ marginBottom: 10 }}>Top tutors · {MONTHS[new Date().getMonth()]}</p>
              {topTutors.length === 0 ? <p style={{ fontWeight: 600 }}>No completed classes this month yet.</p> : topTutors.map(([name, hrs], i) => (
                <div key={name} className="rank-item"><b>{i + 1}</b><p>{name}</p><b style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>{hrs.toFixed(1)} h</b></div>
              ))}
            </div>

            <div className="feed-tile">
              <div className="row-between" style={{ marginBottom: 6 }}><h3>Latest bookings</h3><button className="text-btn" onClick={() => setTab('bookings')}>All bookings →</button></div>
              {feed.length === 0 ? <p>No bookings on the platform yet.</p> : feed.map(b => (
                <div key={b.id} className="feed-row">
                  <span className="dot" style={{ background: STATUS_DOT[b.status] || '#9794AA' }}></span>
                  <p>{b.parentName} → {b.tutorName} · {b.status}</p>
                  <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 700 }}>{formatDate(b.date)} · {to12h(b.startTime)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(tab === 'tutors' || tab === 'parents' || tab === 'admins') && (
          <>
            <div className="dash-head"><h1>{tab === 'tutors' ? 'Tutors' : tab === 'parents' ? 'Students & Parents' : 'Admins'}</h1></div>
            <div className="people-tools">
              <div className="search"><i className="ri-search-line"></i><input className="input" placeholder="Search by name, email or city" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              {tab === 'tutors' && (
                <div className="seg">
                  {[['all', 'All'], ['pending', `Pending · ${pendingTutors.length}`], ['active', 'Active'], ['suspended', 'Suspended']].map(([id, l]) => <button key={id} className={tutorFilter === id ? 'active' : ''} onClick={() => setTutorFilter(id)}>{l}</button>)}
                </div>
              )}
            </div>
            <div className="people-list">
              {tab === 'tutors' && (tutorRows.length ? tutorRows.map(t => { const [l, c] = tutorStatus(t); return personRow(t, `${t.subjects?.join(', ') || 'Tutor'}${t.city ? ` · ${t.city}` : ''}`, <span className={`pill ${c}`}>{l}</span>); }) : <p style={{ padding: 12 }}>No tutors match.</p>)}
              {tab === 'parents' && (parents.filter(match).length ? parents.filter(match).map(p => personRow(p, `Student: ${p.studentName || '—'}${p.studentClass ? ` · ${p.studentClass}` : ''}`, <span className="pill pill-muted">Parent</span>)) : <p style={{ padding: 12 }}>No parents match.</p>)}
              {tab === 'admins' && admins.filter(match).map(a => personRow(a, a.email === userData?.email ? 'You' : 'Admin', <span className="pill" style={{ background: 'var(--lilac)' }}>Admin</span>))}
            </div>
          </>
        )}

        {tab === 'bookings' && (
          <>
            <div className="dash-head"><h1>Platform Bookings</h1></div>
            <div className="people-list">
              {bookings.length === 0 ? <p style={{ padding: 12 }}>No bookings found on the platform yet.</p> : [...bookings].sort((a, b) => new Date(b.date) - new Date(a.date)).map(b => (
                <div key={b.id} className="booking-row">
                  <b style={{ color: 'var(--ink)' }}>{formatDate(b.date)}</b>
                  <span>{b.tutorName}</span>
                  <span className="muted">{b.parentName}</span>
                  <span className="muted">{to12h(b.startTime)} – {to12h(b.endTime)}</span>
                  <span><span className={`pill ${b.status === 'completed' || b.status === 'confirmed' ? 'pill-success' : b.status === 'cancelled' ? 'pill-danger' : 'pill-warning'}`}>{b.status}</span></span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'settings' && (
          <div className="settings-wrap">
            <div className="dash-head"><h1>Settings</h1></div>
            <div className="set-list">
              <div className={`set-row ${feeEdit ? 'editing' : ''}`}>
                <span className="ic tint-4"><i className="ri-percent-line"></i></span>
                <div className="grow">
                  <b>Platform fee</b>
                  <p><small>{feeEdit ? `Current ${currentFee}% · a ₹600/hr tutor would keep ₹${takeHome(600, feeEdit.rate)}` : `Share of each tutor's hourly rate · a ₹600/hr tutor keeps ₹${takeHome(600, currentFee)}`}</small></p>
                </div>
                {feeEdit ? (
                  <>
                    <div className="fee-input"><input className="input" type="number" min="0" max="30" step="0.5" value={feeEdit.rate} onChange={(e) => setFeeEdit({ ...feeEdit, rate: e.target.value })} autoFocus /><span>%</span></div>
                    <div className="date-input"><label className="field-label" style={{ fontSize: '0.7rem', marginBottom: 2 }}>STARTS</label><input className="input" type="date" min={todayISO} value={feeEdit.from} onChange={(e) => setFeeEdit({ ...feeEdit, from: e.target.value })} style={{ height: 44 }} /></div>
                    <button className="btn-soft btn-sm" onClick={() => setFeeEdit(null)}>Cancel</button>
                    <button className="btn btn-sm" onClick={saveFee} disabled={String(feeEdit.rate) === '' || (Number(feeEdit.rate) === currentFee && feeEdit.from === todayISO)}>Save</button>
                  </>
                ) : (
                  <>
                    <b style={{ fontSize: '1.2rem' }}>{currentFee}%</b>
                    <button className="btn-soft btn-sm" onClick={() => setFeeEdit({ rate: currentFee, from: todayISO })}><i className="ri-pencil-line"></i>Edit</button>
                  </>
                )}
              </div>
              <button className="set-row" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }} onClick={handleSignOut}>
                <span className="ic tint-0"><i className="ri-logout-box-r-line"></i></span>
                <div className="grow"><b>Sign out</b><p><small>{userData?.email}</small></p></div>
                <i className="ri-arrow-right-s-line" style={{ fontSize: '1.2rem', color: 'var(--muted)' }}></i>
              </button>
            </div>
            {scheduled && (
              <div className="scheduled">
                <i className="ri-calendar-schedule-line" style={{ fontSize: '1.2rem' }}></i>
                <span>{scheduled.nextRate}% starts {formatDate(scheduled.nextRateFrom)}. Classes before then stay at {currentFee}%.</span>
                <button className="text-btn" onClick={cancelScheduled}>Cancel change</button>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedUser && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedUser(null)}></div>
          <aside className="drawer" role="dialog" aria-modal="true">
            <div className="row-between">
              <span className="eyebrow" style={{ margin: 0 }}>USER PROFILE</span>
              <button className="icon-btn" style={{ background: 'var(--surface-2)' }} onClick={() => setSelectedUser(null)} aria-label="Close"><i className="ri-close-line"></i></button>
            </div>
            <div className={`drawer-head ${selectedUser.role === 'tutor' && !selectedUser.isVerified ? 'tile-peach' : 'tile-lilac'}`}>
              <Avatar user={selectedUser} size={64} radius={20} />
              <div>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>{selectedUser.name}</p>
                <p style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'capitalize' }}>{selectedUser.role}{selectedUser.role === 'tutor' ? ` · ${tutorStatus(selectedUser)[0]}` : ''}</p>
              </div>
            </div>
            <div className="fact-grid">
              <div className="fact wide"><small>EMAIL</small><span>{selectedUser.email}</span></div>
              <div className="fact"><small>PHONE</small><span>{selectedUser.phone || '—'}</span></div>
              <div className="fact"><small>CITY</small><span>{selectedUser.city || '—'}{selectedUser.location ? ' · GPS' : ''}</span></div>
              {selectedUser.role === 'tutor' && (
                <>
                  <div className="fact"><small>HOURLY RATE</small><span>₹{selectedUser.hourlyRate || 0}</span></div>
                  <div className="fact"><small>BOARDS</small><span>{selectedUser.boards?.join(' · ') || '—'}</span></div>
                  <div className="fact wide"><small>SUBJECTS · CLASSES</small><span>{selectedUser.subjects?.join(', ') || '—'} · {classRange(selectedUser.classLevels)}</span></div>
                  <div className="fact wide"><small>BIO</small><span style={{ fontWeight: 500 }}>"{selectedUser.bio || '—'}"</span></div>
                </>
              )}
              {selectedUser.role === 'parent' && (
                <>
                  <div className="fact"><small>STUDENT</small><span>{selectedUser.studentName || '—'}</span></div>
                  <div className="fact"><small>CLASS</small><span>{selectedUser.studentClass || '—'}</span></div>
                  <div className="fact wide"><small>BOARD</small><span>{selectedUser.studentBoard?.join(', ') || '—'}</span></div>
                </>
              )}
            </div>
            <div className="drawer-actions">
              {selectedUser.role === 'tutor' && !selectedUser.isVerified && !selectedUser.isSuspended && (
                <button className="btn btn-success btn-lg btn-block" onClick={() => handleApprove(selectedUser)}><i className="ri-check-line"></i>Approve tutor</button>
              )}
              <div className="row">
                {selectedUser.role !== 'admin' ? (
                  <>
                    <button className="btn-soft" onClick={() => handleToggleAdmin(selectedUser, true)}><i className="ri-shield-star-line"></i>Make admin</button>
                    <button className="btn-soft" style={{ background: 'var(--butter)' }} onClick={() => handleSuspend(selectedUser, !selectedUser.isSuspended)}>
                      <i className={selectedUser.isSuspended ? 'ri-play-circle-line' : 'ri-pause-circle-line'}></i>{selectedUser.isSuspended ? 'Reactivate' : 'Suspend'}
                    </button>
                  </>
                ) : userData?.email !== selectedUser.email ? (
                  <button className="btn-soft" style={{ gridColumn: 'span 2' }} onClick={() => handleToggleAdmin(selectedUser, false)}><i className="ri-user-unfollow-line"></i>Remove admin</button>
                ) : <span style={{ gridColumn: 'span 2' }}></span>}
                <button className="btn-danger btn-icon" style={{ width: 48, height: 48 }} title="Delete permanently" onClick={() => handleRemove(selectedUser)}><i className="ri-delete-bin-6-line"></i></button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
