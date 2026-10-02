import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { useFeedback } from '../components/Feedback';
import { formatDate, isPast, fromISO, toISO, to12h } from '../utils/tutor';
import { fetchFeeSettings, effectiveFee } from '../utils/fees';

const STATUS_PILL = { confirmed: 'pill-success', pending: 'pill-warning', cancelled: 'pill-danger', completed: 'pill-success' };
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
const GPS_RADIUS_KM = 1.0;

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

const elapsed = (startISO, now) => {
  const s = Math.max(0, Math.floor((now - new Date(startISO)) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
const minutesBetween = (start, end) => (new Date(`1970-01-01T${end}`) - new Date(`1970-01-01T${start}`)) / 60000;

// GPS check-in bottom sheet / dialog
function GpsCheckIn({ booking, onClose, onStarted }) {
  const [phase, setPhase] = useState('checking'); // checking | ok | far | error
  const [dist, setDist] = useState(null);
  const [msg, setMsg] = useState('');
  const [starting, setStarting] = useState(false);

  const check = () => {
    setPhase('checking');
    if (!booking.parentLocation?.lat) { setPhase('error'); setMsg("The student hasn't shared their GPS location, so hours can't be tracked for this booking."); return; }
    if (!navigator.geolocation) { setPhase('error'); setMsg('Geolocation is not supported by your browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = getDistanceKm(pos.coords.latitude, pos.coords.longitude, booking.parentLocation.lat, booking.parentLocation.lng);
        setDist(d);
        setPhase(d > GPS_RADIUS_KM ? 'far' : 'ok');
      },
      () => { setPhase('error'); setMsg('Failed to get your location. Please allow location access and try again.'); },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => { check(); }, []);

  const start = async () => {
    setStarting(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { actualStartTime: new Date().toISOString() });
      onStarted();
    } catch (err) {
      console.error(err);
      setPhase('error'); setMsg('Failed to start class. Please try again.');
    }
    setStarting(false);
  };

  return (
    <div className="dlg-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg" role="dialog" aria-modal="true">
        <span className="dlg-grab"></span>
        <div className={`gps-state ${phase}`}>
          <span className="gps-ring">
            <i className={phase === 'checking' ? 'ri-map-pin-user-fill' : phase === 'ok' ? 'ri-checkbox-circle-fill' : phase === 'far' ? 'ri-route-line' : 'ri-map-pin-off-line'}></i>
          </span>
          <h3>
            {phase === 'checking' && 'Checking your location…'}
            {phase === 'ok' && `You're at ${booking.parentName?.split(' ')[0] || 'the student'}'s home`}
            {phase === 'far' && `${dist?.toFixed(1)} km away`}
            {phase === 'error' && "Can't start with GPS"}
          </h3>
          <p>
            {phase === 'checking' && `You need to be within ${GPS_RADIUS_KM} km of the student's home.`}
            {phase === 'ok' && `${dist?.toFixed(1)} km away · ${to12h(booking.startTime)} – ${to12h(booking.endTime)}`}
            {phase === 'far' && "Move closer to the student's home to start the class."}
            {phase === 'error' && msg}
          </p>
        </div>
        {phase === 'ok' && <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>The timer starts when you tap Start and stops when you tap Stop class.</p>}
        <div className="dlg-actions">
          <button className="btn-soft" onClick={onClose}>{phase === 'ok' ? 'Not now' : 'Close'}</button>
          {phase === 'ok' && <button className="btn" disabled={starting} onClick={start}><i className="ri-play-fill"></i>{starting ? 'Starting…' : 'Start class'}</button>}
          {(phase === 'far' || phase === 'error') && <button className="btn" onClick={check}>Try again</button>}
          {phase === 'checking' && <button className="btn" disabled>Checking…</button>}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { currentUser, userData } = useAuth();
  const { toast, confirm } = useFeedback();
  const isTutor = userData?.role === 'tutor';
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rateBookingId, setRateBookingId] = useState(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [gpsBooking, setGpsBooking] = useState(null);
  const [stoppingClassId, setStoppingClassId] = useState(null);
  const [feeSettings, setFeeSettings] = useState({ commissionRate: 5 });
  const [now, setNow] = useState(Date.now());

  const fetchBookings = async () => {
    if (!currentUser || !userData) return;
    setLoadingBookings(true);
    try {
      const field = isTutor ? 'tutorId' : 'parentId';
      const snap = await getDocs(query(collection(db, 'bookings'), where(field, '==', currentUser.uid)));
      const results = [];
      snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
      results.sort((a, b) => new Date(a.date) - new Date(b.date));
      setBookings(results);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
    setLoadingBookings(false);
  };

  useEffect(() => { fetchBookings(); fetchFeeSettings().then(setFeeSettings); }, [currentUser, userData, isTutor]);

  const live = bookings.find(b => b.actualStartTime && !b.actualEndTime);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live?.id]);

  const handleAccept = async (id) => {
    try { await updateDoc(doc(db, 'bookings', id), { status: 'confirmed' }); toast('Booking accepted'); fetchBookings(); }
    catch (err) { console.error('Error accepting booking:', err); toast('Failed to accept booking.', 'error'); }
  };

  // Cancel / decline — reason (min 10 words) collected in the dialog
  const cancelBooking = async (b, decline = false) => {
    const who = isTutor ? b.parentName : b.tutorName;
    const reason = await confirm({
      tone: 'danger',
      title: decline ? 'Decline this request?' : 'Cancel this class?',
      message: `${formatDate(b.date)} · ${to12h(b.startTime)} with ${who}`,
      input: { type: 'textarea', label: 'Reason (minimum 10 words)', minWords: 10, placeholder: `Let ${who?.split(' ')[0] || 'them'} know why…` },
      cancelText: decline ? 'Back' : 'Keep class',
      confirmText: decline ? 'Decline' : 'Cancel class'
    });
    if (!reason) return;
    try {
      await updateDoc(doc(db, 'bookings', b.id), { status: 'cancelled', cancelReason: reason });
      toast(decline ? 'Request declined' : 'Class cancelled');
      fetchBookings();
    } catch (err) { console.error('Error cancelling booking:', err); toast('Failed to cancel booking.', 'error'); }
  };

  const handleRateSubmit = async (id) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { rating, review: review.trim() });
      setRateBookingId(null); setRating(5); setReview('');
      toast('Rating submitted · thank you');
      fetchBookings();
    } catch (err) { console.error('Error rating booking:', err); toast('Failed to submit rating.', 'error'); }
  };

  const openRate = (id, stars = 5) => { setRateBookingId(id); setRating(stars); setReview(''); };

  const handleStopClass = async (b) => {
    const ok = await confirm({ title: 'Stop this class?', message: `Elapsed ${elapsed(b.actualStartTime, Date.now())} with ${b.parentName}.`, icon: 'ri-stop-circle-line', confirmText: 'Stop class', cancelText: 'Keep going' });
    if (!ok) return;
    setStoppingClassId(b.id);
    try {
      await updateDoc(doc(db, 'bookings', b.id), {
        actualEndTime: new Date().toISOString(),
        status: 'completed',
        commissionRate: effectiveFee(feeSettings, b.date),
        hourlyRate: userData?.hourlyRate || 0
      });
      toast('Class completed · hours logged');
      fetchBookings();
    } catch (err) {
      console.error(err);
      toast('Failed to stop class.', 'error');
    }
    setStoppingClassId(null);
  };

  const pending = bookings.filter(b => b.status === 'pending');
  const upcoming = bookings.filter(b => b.status === 'confirmed' && !isPast(b.date) && b.id !== live?.id);
  const nextClass = upcoming[0];
  const toRate = bookings.find(b => (b.status === 'completed' || (b.status === 'confirmed' && isPast(b.date))) && !b.rating);

  const completed = bookings.filter(b => b.status === 'completed');
  const thisMonth = toISO(new Date()).slice(0, 7);
  let monthEarnings = 0, totalHours = 0;
  const recentDone = [];
  completed.forEach(b => {
    if (b.actualStartTime && b.actualEndTime) {
      const hrs = (new Date(b.actualEndTime) - new Date(b.actualStartTime)) / 3600000;
      const rate = b.hourlyRate || userData?.hourlyRate || 0;
      const fee = b.commissionRate !== undefined ? b.commissionRate : effectiveFee(feeSettings, b.date);
      const net = hrs * rate * (1 - fee / 100);
      totalHours += hrs;
      if (b.date?.slice(0, 7) === thisMonth) monthEarnings += net;
      recentDone.push({ ...b, hrs, net });
    }
  });
  recentDone.sort((a, b) => new Date(b.actualEndTime) - new Date(a.actualEndTime));

  const firstName = (userData?.name || '').split(' ')[0] || currentUser?.email;
  const child = userData?.studentName?.split(' ')[0];
  const daysUntil = (iso) => {
    const diff = Math.round((fromISO(iso) - fromISO(toISO(new Date()))) / 86400000);
    return diff <= 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`;
  };

  const filtered = bookings.filter(b =>
    filter === 'all' ? true : filter === 'upcoming' ? !isPast(b.date) && b.status !== 'cancelled' && b.status !== 'completed' : isPast(b.date) || b.status === 'cancelled' || b.status === 'completed'
  );

  const renderStars = (value, onPick) => (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(s => <i key={s} className={s <= value ? 'ri-star-fill' : 'ri-star-line'} onClick={() => onPick && onPick(s)}></i>)}
    </div>
  );

  const renderRateForm = (b) => (
    <div className="inline-form rate">
      <p>Rate your experience with this tutor:</p>
      {renderStars(rating, setRating)}
      <textarea className="textarea" value={review} onChange={(e) => setReview(e.target.value)} placeholder="Leave a short review (optional)" rows="2"></textarea>
      <div className="inline-actions">
        <button onClick={() => handleRateSubmit(b.id)} className="btn btn-sm">Submit Rating</button>
        <button onClick={() => setRateBookingId(null)} className="btn-light btn-sm">Back</button>
      </div>
    </div>
  );

  const renderExtras = (b) => {
    let log = null;
    if (b.actualStartTime && b.actualEndTime) {
      const s = new Date(b.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const e = new Date(b.actualEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const min = Math.round((new Date(b.actualEndTime) - new Date(b.actualStartTime)) / 60000);
      log = <p className="row-note" style={{ color: 'var(--success)', fontWeight: 600, fontStyle: 'normal' }}><i className="ri-time-line"></i> GPS log: {s} – {e} ({min} mins)</p>;
    }
    return (
      <>
        {b.message && <p className="row-note">"{b.message}"</p>}
        {log}
        {b.status === 'cancelled' && b.cancelReason && <p className="row-reason">Reason: {b.cancelReason}</p>}
        {b.rating && (
          <p className="row-stars">
            {[...Array(5)].map((_, i) => <i key={i} className={i < b.rating ? 'ri-star-fill' : 'ri-star-line'}></i>)}
            {b.review && <span className="muted"> "{b.review}"</span>}
          </p>
        )}
      </>
    );
  };

  if (loadingBookings && !bookings.length) {
    return <div className="page dash-page"><div className="spinner-container"><div className="spinner"></div></div></div>;
  }

  // ---------------- TUTOR ----------------
  if (isTutor) {
    const past = bookings.filter(b => b.status === 'cancelled' || b.status === 'completed' || (b.status === 'confirmed' && isPast(b.date) && !b.actualStartTime));
    let pct = 0;
    if (live) {
      const planned = minutesBetween(live.startTime, live.endTime) || 60;
      pct = Math.min(100, ((now - new Date(live.actualStartTime)) / 60000 / planned) * 100);
    }
    return (
      <div className="page dash-page">
        <div className="container">
          {userData && !userData.isVerified && (
            <div className="alert alert-warning">
              <i className="ri-error-warning-fill"></i>
              <div><p style={{ fontWeight: 800 }}>Account Pending Verification</p><p>Your profile is currently under review by our team. Parents will not be able to find or book you until your account is verified.</p></div>
            </div>
          )}
          <div className="dash-head">
            <h1>Hi {firstName}{live ? <> <span className="accent">—</span> class in progress</> : pending.length > 0 && <> <span className="accent">—</span> {pending.length} parent{pending.length > 1 ? 's are' : ' is'} waiting</>}</h1>
          </div>

          <div className="dash-top">
            {live ? (
              <div className="live-tile">
                <div className="live-ring" style={{ background: `conic-gradient(#7EDCA8 0 ${pct}%, rgba(255,255,255,.14) ${pct}% 100%)` }}>
                  <div><b>{elapsed(live.actualStartTime, now)}</b><span>ELAPSED</span></div>
                </div>
                <div className="live-info">
                  <span className="badge-live">● LIVE · GPS verified</span>
                  <h3>{live.parentName}</h3>
                  <p>Started {new Date(live.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · planned until {to12h(live.endTime)}</p>
                </div>
                <button className="btn btn-stop" disabled={stoppingClassId === live.id} onClick={() => handleStopClass(live)}>
                  <i className="ri-stop-fill"></i>{stoppingClassId === live.id ? 'Stopping…' : 'Stop class'}
                </button>
              </div>
            ) : (
              <div className="live-idle">
                <p className="eyebrow">Next class</p>
                {nextClass ? (
                  <>
                    <h3>{nextClass.parentName}</h3>
                    <p style={{ fontWeight: 600, margin: 0 }}>{formatDate(nextClass.date)} · {to12h(nextClass.startTime)} – {to12h(nextClass.endTime)}</p>
                  </>
                ) : <p style={{ fontWeight: 600, margin: 0 }}>No upcoming classes yet.</p>}
              </div>
            )}
            <div className="stat-tile tile-mint">
              <p className="eyebrow">Earned this month</p>
              <p className="big-num">₹{Math.round(monthEarnings).toLocaleString('en-IN')}</p>
              <p style={{ fontWeight: 700, fontSize: '0.8rem' }}>{totalHours.toFixed(1)} h tracked · after {effectiveFee(feeSettings)}% platform fee</p>
            </div>
            <div className="stat-tile tile-peach">
              <p className="eyebrow">New requests</p>
              <p className="big-num">{pending.length}</p>
              <p style={{ fontWeight: 700, fontSize: '0.8rem' }}>{upcoming.length} upcoming class{upcoming.length !== 1 ? 'es' : ''}</p>
            </div>
          </div>

          <div className="tutor-dash">
            <div className="list-tile" style={{ gridColumn: 'auto' }}>
              <div className="list-head"><h3>Class Requests</h3></div>
              {pending.length === 0 ? (
                <p style={{ padding: '0 0.8rem 0.8rem' }}>No new requests right now.</p>
              ) : (
                <div className="request-list">
                  {pending.map(b => (
                    <div key={b.id} className="request">
                      <div className="request-top">
                        <Avatar user={{ name: b.parentName }} size={52} radius={18} />
                        <div className="body">
                          <p className="who">{b.parentName}</p>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatDate(b.date)} · {to12h(b.startTime)} – {to12h(b.endTime)}</p>
                          {b.message && <p className="row-note">"{b.message}"</p>}
                        </div>
                        <div className="row-actions">
                          <button onClick={() => cancelBooking(b, true)} className="btn-light btn-sm">Decline</button>
                          <button onClick={() => handleAccept(b.id)} className="btn btn-sm">Accept</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="list-head" style={{ marginTop: 6 }}><h3>Upcoming</h3></div>
              {upcoming.length === 0 ? <p style={{ padding: '0 0.8rem 0.8rem' }}>You have no classes scheduled.</p> : upcoming.map(b => {
                const d = fromISO(b.date);
                const hasGps = !!b.parentLocation?.lat;
                return (
                  <div key={b.id} className="schedule-item" style={{ background: 'var(--surface-3)', marginTop: 6 }}>
                    <div className="date-chip"><span>{d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</span><b>{d.getDate()}</b></div>
                    <div className="body">
                      <p style={{ fontWeight: 800, color: 'var(--ink)' }}>{b.parentName}</p>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{to12h(b.startTime)} – {to12h(b.endTime)} · <span className={`gps-tag ${hasGps ? 'on' : 'off'}`}><i className={hasGps ? 'ri-map-pin-line' : 'ri-map-pin-off-line'}></i> {hasGps ? 'GPS saved' : 'No GPS · timer off'}</span></p>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => cancelBooking(b)} className="btn-light btn-sm">Cancel</button>
                      {!live && <button onClick={() => setGpsBooking(b)} className="btn btn-sm"><i className="ri-play-fill"></i>Start</button>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="tile tile-lilac">
              <h3 style={{ marginBottom: '0.9rem' }}>Recently completed</h3>
              {recentDone.length === 0 ? <p style={{ fontWeight: 600 }}>Completed classes and your take-home will appear here.</p> : recentDone.slice(0, 5).map(b => (
                <div key={b.id} className="done-item">
                  <div><p style={{ fontWeight: 800, color: 'var(--ink)' }}>{b.parentName}</p><p style={{ fontSize: '0.75rem', fontWeight: 600 }}>{formatDate(b.date)} · {Math.round(b.hrs * 60)} min</p></div>
                  <div style={{ textAlign: 'right' }}><p style={{ fontWeight: 800, color: 'var(--ink)' }}>₹{Math.round(b.net)}</p><p style={{ fontSize: '0.7rem', fontWeight: 700 }}>net</p></div>
                </div>
              ))}
            </div>
          </div>

          {past.length > 0 && (
            <div className="list-tile" style={{ marginTop: 14 }}>
              <div className="list-head"><h3>Past &amp; cancelled</h3></div>
              {past.map(b => (
                <div key={b.id}>
                  <div className="list-row">
                    <Avatar user={{ name: b.parentName }} size={50} radius={16} />
                    <div><p className="t">{b.parentName}</p></div>
                    <span className="when">{formatDate(b.date)} · {to12h(b.startTime)}</span>
                    <span className="status"><span className={`pill ${STATUS_PILL[b.status] || 'pill-muted'}`}>{b.status === 'confirmed' ? 'Not tracked' : cap(b.status)}</span></span>
                    <span className="row-actions">{b.rating ? <span className="row-stars">{b.rating} ★</span> : <span className="muted">—</span>}</span>
                  </div>
                  <div className="row-extra">{renderExtras(b)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {gpsBooking && <GpsCheckIn booking={gpsBooking} onClose={() => setGpsBooking(null)} onStarted={() => { setGpsBooking(null); toast('Class started · timer running'); fetchBookings(); }} />}
      </div>
    );
  }

  // ---------------- PARENT ----------------
  return (
    <div className="page dash-page">
      <div className="container">
        <div className="dash-head">
          <h1>Hi {firstName}{child && <> <span className="accent">—</span> here's {child}'s week</>}</h1>
        </div>

        <div className="dash-bento">
          {nextClass ? (
            <div className="next-tile">
              <div className="photo"><Avatar user={{ name: nextClass.tutorName }} size={180} radius={0} tint={false} /></div>
              <div className="info">
                <div>
                  <span className="dot-badge">● Confirmed · {daysUntil(nextClass.date)}</span>
                  <p className="when" style={{ marginTop: '0.8rem', color: 'var(--ink)' }}>{formatDate(nextClass.date)}<br />{to12h(nextClass.startTime)} – {to12h(nextClass.endTime)}</p>
                  <p className="who" style={{ marginTop: '0.4rem' }}>{nextClass.tutorName} · at home</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to={`/tutor/${nextClass.tutorId}`} className="btn btn-sm">View tutor</Link>
                  <button onClick={() => cancelBooking(nextClass)} className="btn-light btn-sm">Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="placeholder-tile next-tile" style={{ display: 'flex' }}>
              <p className="eyebrow">Next class</p>
              <h3>No confirmed classes yet</h3>
              <p>Search for expert educators matching your child's needs.</p>
              <Link to="/search" className="btn btn-sm" style={{ alignSelf: 'flex-start' }}>Search Tutors</Link>
            </div>
          )}

          {toRate ? (
            <div className="stat-tile tile-butter" style={{ gap: '0.7rem' }}>
              <p className="eyebrow">Rate your last class</p>
              <h3 style={{ color: 'var(--ink)' }}>{toRate.tutorName}</h3>
              {rateBookingId === toRate.id ? renderRateForm(toRate) : (
                <>
                  {renderStars(0, (s) => openRate(toRate.id, s))}
                  <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{formatDate(toRate.date)} · {to12h(toRate.startTime)}</p>
                </>
              )}
            </div>
          ) : (
            <div className="stat-tile tile-butter">
              <p className="eyebrow">Reviews</p>
              <p style={{ fontWeight: 600 }}>After a class is done you can rate the tutor here.</p>
            </div>
          )}

          <div className="stat-tile tile-mint">
            <p className="eyebrow">Bookings</p>
            <p className="big-num" style={{ fontSize: '4.5rem' }}>{bookings.filter(b => b.status !== 'cancelled').length}</p>
            <p style={{ fontWeight: 700 }}>{upcoming.length} upcoming · {pending.length} pending</p>
          </div>

          <div className="list-tile" id="bookings">
            <div className="list-head">
              <h3>My Bookings</h3>
              <div className="seg">
                {['all', 'upcoming', 'past'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{cap(f)}</button>)}
              </div>
            </div>
            {filtered.length === 0 ? (
              <p style={{ padding: '0.4rem 0.8rem 0.9rem' }}>{bookings.length === 0 ? 'You have not booked any classes yet.' : 'Nothing here.'}</p>
            ) : filtered.map(b => (
              <div key={b.id}>
                <div className="list-row">
                  <Avatar user={{ name: b.tutorName }} size={56} radius={18} />
                  <div><Link to={`/tutor/${b.tutorId}`} className="t">{b.tutorName}</Link></div>
                  <span className="when">{formatDate(b.date)} · {to12h(b.startTime)} – {to12h(b.endTime)}</span>
                  <span className="status"><span className={`pill ${STATUS_PILL[b.status] || 'pill-muted'}`}>{cap(b.status)}</span></span>
                  <span className="row-actions">
                    {(b.status === 'completed' || (b.status === 'confirmed' && isPast(b.date))) && !b.rating && rateBookingId !== b.id && (
                      <button onClick={() => openRate(b.id)} className="btn btn-sm">Rate Tutor</button>
                    )}
                    {(b.status === 'pending' || (b.status === 'confirmed' && !b.actualStartTime && !isPast(b.date))) && rateBookingId !== b.id && (
                      <button onClick={() => cancelBooking(b)} className="btn-danger btn-sm">Cancel</button>
                    )}
                  </span>
                </div>
                <div className="row-extra">
                  {renderExtras(b)}
                  {rateBookingId === b.id && b.id !== toRate?.id && renderRateForm(b)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
