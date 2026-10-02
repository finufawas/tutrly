import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { useFeedback } from '../components/Feedback';
import { classRange } from '../utils/tutor';
import { fetchFeeSettings, effectiveFee, takeHome } from '../utils/fees';

function MyProfile() {
  const { currentUser, userData } = useAuth();
  const { toast, confirm } = useFeedback();
  const navigate = useNavigate();
  const [fee, setFee] = useState(5);
  const [stats, setStats] = useState({ avg: null, done: 0 });
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light');
  const isTutor = userData?.role === 'tutor';

  useEffect(() => { fetchFeeSettings().then(s => setFee(effectiveFee(s))); }, []);

  useEffect(() => {
    if (!isTutor || !currentUser) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'bookings'), where('tutorId', '==', currentUser.uid)));
        let sum = 0, n = 0, done = 0;
        snap.forEach(d => { const b = d.data(); if (b.status === 'completed') done++; if (b.rating) { sum += b.rating; n++; } });
        setStats({ avg: n ? (sum / n).toFixed(1) : null, done });
      } catch (e) { /* stats are optional */ }
    })();
  }, [isTutor, currentUser]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
      toast('Failed to sign out.', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    const ok = await confirm({
      tone: 'danger',
      title: 'Delete your account?',
      message: 'This removes your profile and booking history. It cannot be undone.',
      cancelText: 'Keep account',
      confirmText: 'Delete'
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid));
      await deleteUser(currentUser);
      navigate('/');
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        toast('Please sign out and sign back in to verify your identity before deleting your account.', 'warning');
      } else {
        toast('Failed to delete account: ' + error.message, 'error');
      }
    }
  };

  const shareProfile = async () => {
    const text = `Hi! I'm teaching ${userData?.subjects?.[0] || 'students'} in ${userData?.city || 'your area'}. Book a home class with me on Tutrly: ${window.location.origin}/tutor/${currentUser.uid}`;
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      toast('Share it on WhatsApp to get more students.', 'info', { title: 'Profile link copied' });
    } catch (e) { /* share sheet dismissed */ }
  };

  if (!userData) return <div className="page"><div className="spinner-container"><div className="spinner"></div></div></div>;

  return (
    <div className="page">
      <div className="profile-wrap">
        <div className="dash-head"><h1>My Profile</h1></div>

        <div className="me-bento">
          <div className={`me-hero ${isTutor ? '' : 'parent'}`}>
            {isTutor && <div className="photo"><Avatar user={userData} size={200} radius={0} tint={false} /></div>}
            <div className="info">
              {isTutor && (userData.isVerified
                ? <span className="verified-badge" style={{ alignSelf: 'flex-start' }}><i className="ri-shield-check-fill"></i>Verified tutor</span>
                : <span className="pill pill-warning" style={{ alignSelf: 'flex-start' }}>Pending verification</span>)}
              {!isTutor && <span className="verified-badge" style={{ alignSelf: 'flex-start', textTransform: 'capitalize' }}>{userData.role} account</span>}
              <h1>{userData.name}</h1>
              <p>{userData.email}</p>
              {userData.city && <p><i className="ri-map-pin-2-line"></i> {userData.city}{userData.location ? ' · GPS saved' : ''}</p>}
              {!isTutor && userData.studentName && <p><i className="ri-user-smile-line"></i> {userData.studentName}{userData.studentClass ? ` · ${userData.studentClass}` : ''}</p>}
              <div className="me-actions">
                {isTutor && <button className="btn" onClick={shareProfile}><i className="ri-share-forward-line"></i>Share profile</button>}
                <Link to="/edit-profile" className={isTutor ? 'btn-light' : 'btn'}><i className="ri-pencil-line"></i>Edit profile</Link>
              </div>
            </div>
          </div>

          {isTutor ? (
            <>
              <div className="stat-tile tile-mint">
                <p className="eyebrow">Hourly rate</p>
                <p className="big-num">₹{userData.hourlyRate || 0}</p>
                <p style={{ fontWeight: 700, fontSize: '0.8rem' }}>You take home ₹{takeHome(userData.hourlyRate, fee)} after the {fee}% fee</p>
              </div>
              <div className="stat-tile tile-butter">
                <p className="eyebrow">Rating</p>
                <p className="big-num">{stats.avg || 'New'}</p>
                <p style={{ fontWeight: 700, fontSize: '0.8rem' }}>from {stats.done} completed class{stats.done !== 1 ? 'es' : ''}</p>
              </div>
              <div className="tile me-wide" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <p className="eyebrow">Teaches</p>
                <div className="chip-row">
                  {userData.subjects?.map((s, i) => <span key={s} className={`tag tint-${i % 5}`}>{s}</span>)}
                  {userData.classLevels?.length > 0 && <span className="tag tint-3">{classRange(userData.classLevels)}</span>}
                  {userData.boards?.length > 0 && <span className="tag" style={{ background: 'var(--surface-2)' }}>{userData.boards.join(' · ')}</span>}
                </div>
                <p style={{ color: 'var(--ink-2)', whiteSpace: 'pre-wrap', margin: 0 }}>{userData.bio || 'No bio added yet.'}</p>
              </div>
            </>
          ) : (
            <>
              <div className="stat-tile tile-mint">
                <p className="eyebrow">Student</p>
                <p className="big-num" style={{ fontSize: '2rem' }}>{userData.studentName || '—'}</p>
                <p style={{ fontWeight: 700 }}>{userData.studentClass || 'Class not set'}</p>
              </div>
              <div className="stat-tile tile-sky">
                <p className="eyebrow">Board</p>
                <p className="big-num" style={{ fontSize: '2rem' }}>{userData.studentBoard?.join(' · ') || '—'}</p>
                <p style={{ fontWeight: 700 }}>{userData.phone || 'No phone added'}</p>
              </div>
            </>
          )}

          <div className="settings-list me-full">
            <button className="setting-item" onClick={toggleTheme}>
              <span className="ic tint-3"><i className={theme === 'light' ? 'ri-moon-line' : 'ri-sun-line'}></i></span>
              <span style={{ flex: 1 }}><b>Dark theme</b><small>Also in the top navigation</small></span>
              <span className={`switch ${theme === 'dark' ? 'on' : ''}`}></span>
            </button>
            <button className="setting-item" onClick={handleLogout}>
              <span className="ic tint-0"><i className="ri-logout-box-r-line"></i></span>
              <span style={{ flex: 1 }}><b>Sign out</b><small>On this device</small></span>
              <i className="ri-arrow-right-s-line" style={{ fontSize: '1.2rem', color: 'var(--muted)' }}></i>
            </button>
            <button className="setting-item danger" onClick={handleDeleteAccount}>
              <span className="ic" style={{ background: 'var(--peach)' }}><i className="ri-delete-bin-6-line"></i></span>
              <span style={{ flex: 1 }}><b>Delete account</b><small>Permanently remove your data</small></span>
              <i className="ri-arrow-right-s-line" style={{ fontSize: '1.2rem' }}></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyProfile;
