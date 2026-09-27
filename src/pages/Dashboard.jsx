import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Link, NavLink } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { formatDate, isPast, fromISO, initials } from '../utils/tutor';

const STATUS_PILL = { confirmed: 'pill-success', pending: 'pill-warning', cancelled: 'pill-danger' };
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

function Dashboard() {
  const { currentUser, userData } = useAuth();
  const isTutor = userData?.role === 'tutor';

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [filter, setFilter] = useState('all');

  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rateBookingId, setRateBookingId] = useState(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  const fetchBookings = async () => {
    if (!currentUser || !userData) return;
    setLoadingBookings(true);
    try {
      const field = isTutor ? 'tutorId' : 'parentId';
      const q = query(collection(db, 'bookings'), where(field, '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const results = [];
      querySnapshot.forEach((docSnap) => results.push({ id: docSnap.id, ...docSnap.data() }));
      results.sort((a, b) => new Date(a.date) - new Date(b.date));
      setBookings(results);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
    setLoadingBookings(false);

    // Explicitly scroll to top after loading finishes so the browser doesn't jump
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);
  };

  useEffect(() => { fetchBookings(); }, [currentUser, userData, isTutor]);

  const handleAccept = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: 'confirmed' });
      fetchBookings();
    } catch (err) {
      console.error('Error accepting booking:', err);
      alert('Failed to accept booking.');
    }
  };

  const handleCancelSubmit = async (bookingId) => {
    const words = cancelReason.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 10) {
      alert('Please provide a reason with at least 10 words.');
      return;
    }
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled', cancelReason: cancelReason.trim() });
      setCancelBookingId(null);
      setCancelReason('');
      fetchBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert('Failed to cancel booking.');
    }
  };

  const handleRateSubmit = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { rating, review: review.trim() });
      setRateBookingId(null);
      setRating(5);
      setReview('');
      fetchBookings();
    } catch (err) {
      console.error('Error rating booking:', err);
      alert('Failed to submit rating.');
    }
  };

  const openCancel = (id) => { setRateBookingId(null); setCancelBookingId(id); setCancelReason(''); };
  const openRate = (id) => { setCancelBookingId(null); setRateBookingId(id); setRating(5); setReview(''); };

  // ---------- Derived lists ----------
  const pending = bookings.filter(b => b.status === 'pending');
  const upcomingConfirmed = bookings.filter(b => b.status === 'confirmed' && !isPast(b.date));
  const nextClass = upcomingConfirmed[0];
  const toRate = bookings.find(b => b.status === 'confirmed' && isPast(b.date) && !b.rating);
  const rated = bookings.filter(b => b.rating);
  const avgRating = rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : '—';
  const displayName = userData?.name || currentUser?.email;
  const firstName = (userData?.name || '').split(' ')[0] || displayName;

  const filtered = bookings.filter(b =>
    filter === 'all' ? true : filter === 'upcoming' ? !isPast(b.date) && b.status !== 'cancelled' : isPast(b.date) || b.status === 'cancelled'
  );

  // ---------- Inline forms (same rules as before) ----------
  const renderCancelForm = (b) => {
    const words = cancelReason.trim().split(/\s+/).filter(w => w.length > 0);
    const isValidCancel = words.length >= 10;
    return (
      <div className="inline-form cancel">
        <p>Provide a reason for cancellation (Min 10 words):</p>
        <textarea className="textarea" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows="2" style={{ minHeight: 64 }}></textarea>
        <span className={isValidCancel ? 'count-ok' : 'count-bad'}>Word count: {words.length}/10</span>
        <div className="inline-actions">
          <button onClick={() => handleCancelSubmit(b.id)} disabled={!isValidCancel} className="btn-primary btn-sm" style={{ background: 'var(--danger)', opacity: isValidCancel ? 1 : 0.5 }}>Confirm Cancel</button>
          <button onClick={() => { setCancelBookingId(null); setCancelReason(''); }} className="btn-outline btn-sm">Back</button>
        </div>
      </div>
    );
  };

  const renderStars = (value, onPick) => (
    <div className="stars-input">
      {[1, 2, 3, 4, 5].map(star => (
        <i key={star} className={star <= value ? 'ri-star-fill' : 'ri-star-line'} onClick={() => onPick && onPick(star)}></i>
      ))}
    </div>
  );

  const renderRateForm = (b) => (
    <div className="inline-form rate">
      <p>Rate your experience with this tutor:</p>
      {renderStars(rating, setRating)}
      <textarea className="textarea" value={review} onChange={(e) => setReview(e.target.value)} placeholder="Leave a short review (optional)" rows="2" style={{ minHeight: 64 }}></textarea>
      <div className="inline-actions">
        <button onClick={() => handleRateSubmit(b.id)} className="btn-warning btn-primary btn-sm" style={{ background: 'var(--warning)' }}>Submit Rating</button>
        <button onClick={() => setRateBookingId(null)} className="btn-outline btn-sm">Back</button>
      </div>
    </div>
  );

  const renderExtras = (b) => (
    <>
      {b.message && <p className="row-note">"{b.message}"</p>}
      {b.status === 'cancelled' && b.cancelReason && <p className="row-reason">Reason: {b.cancelReason}</p>}
      {b.rating && (
        <div className="row-stars">
          {[...Array(5)].map((_, i) => <i key={i} className={i < b.rating ? 'ri-star-fill' : 'ri-star-line'}></i>)}
          {b.review && <span className="muted" style={{ fontSize: '0.875rem' }}> "{b.review}"</span>}
        </div>
      )}
    </>
  );

  const canCancel = (b) => b.status === 'pending' || b.status === 'confirmed';
  const canRate = (b) => !isTutor && b.status === 'confirmed' && !b.rating;

  // ---------- Layout pieces ----------
  const sidebar = (
    <aside className="dash-side">
      <NavLink to="/dashboard" end className="dash-nav-item active"><i className="ri-dashboard-line"></i>Overview</NavLink>
      {isTutor ? (
        <>
          <a href="#requests" className="dash-nav-item"><i className="ri-inbox-line"></i>Requests{pending.length > 0 && <span className="count">{pending.length}</span>}</a>
          <a href="#schedule" className="dash-nav-item"><i className="ri-calendar-2-line"></i>Schedule</a>
          <Link to="/edit-profile" className="dash-nav-item"><i className="ri-time-line"></i>Availability</Link>
        </>
      ) : (
        <>
          <a href="#bookings" className="dash-nav-item"><i className="ri-calendar-check-line"></i>My Bookings</a>
          <Link to="/search" className="dash-nav-item"><i className="ri-search-eye-line"></i>Find a Tutor</Link>
        </>
      )}
      <Link to="/profile" className="dash-nav-item"><i className="ri-user-3-line"></i>My Profile</Link>
      <div className="dash-user">
        <Avatar user={userData} size={36} radius={18} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)' }}>{displayName}</p>
          <p style={{ fontSize: '0.75rem', color: isTutor && userData?.isVerified ? 'var(--success)' : 'var(--text-light)' }}>
            {isTutor ? (userData?.isVerified ? 'Verified tutor' : 'Pending verification') : 'Parent'}
          </p>
        </div>
      </div>
    </aside>
  );

  if (loadingBookings && !bookings.length) {
    return (
      <div className="dash-shell dash-page">
        {sidebar}
        <main className="dash-main"><div className="spinner-container"><div className="spinner"></div></div></main>
      </div>
    );
  }

  // ---------- TUTOR ----------
  if (isTutor) {
    return (
      <div className="dash-shell dash-page">
        {sidebar}
        <main className="dash-main">
          {userData && !userData.isVerified && (
            <div className="alert alert-warning" style={{ margin: 0 }}>
              <i className="ri-error-warning-fill"></i>
              <div>
                <p style={{ fontWeight: 600 }}>Account Pending Verification</p>
                <p>Your profile is currently under review by our team. Parents will not be able to find or book you until your account is verified.</p>
              </div>
            </div>
          )}

          <div className="dash-head">
            <div>
              <h1>Tutor Dashboard</h1>
              <p>Welcome back, <strong style={{ color: 'var(--text-dark)' }}>{firstName}</strong>.{pending.length > 0 && ` ${pending.length} parent${pending.length > 1 ? 's are' : ' is'} waiting for your reply.`}</p>
            </div>
            <Link to="/edit-profile" className="btn-outline"><i className="ri-time-line"></i>Edit Availability</Link>
          </div>

          <div className="stat-grid">
            <div className="stat"><p className="label">New requests</p><p className="value">{pending.length}</p></div>
            <div className="stat"><p className="label">Upcoming classes</p><p className="value">{upcomingConfirmed.length}</p></div>
            <div className="stat"><p className="label">Rating</p><p className="value">{avgRating}</p><p className="label">{rated.length} review{rated.length !== 1 ? 's' : ''}</p></div>
            <div className="stat"><p className="label">Hourly rate</p><p className="value">₹{userData?.hourlyRate || 0}</p></div>
          </div>

          <div className="dash-row">
            <div className="card" id="requests">
              <h3 className="card-title"><i className="ri-inbox-line"></i>Class Requests</h3>
              {pending.length === 0 ? (
                <p style={{ margin: 0 }}>No new requests right now.</p>
              ) : (
                <div className="request-list">
                  {pending.map(b => (
                    <div key={b.id} className="request">
                      <div className="request-top">
                        <div className="request-body">
                          <p className="who">{b.parentName}</p>
                          <p style={{ fontSize: '0.9rem' }}>{formatDate(b.date)} • {b.startTime} - {b.endTime}</p>
                          {b.message && <p className="row-note">"{b.message}"</p>}
                        </div>
                        {cancelBookingId !== b.id && (
                          <div className="table-actions">
                            <button onClick={() => openCancel(b.id)} className="btn-outline btn-sm">Decline</button>
                            <button onClick={() => handleAccept(b.id)} className="btn-primary btn-sm">Accept</button>
                          </div>
                        )}
                      </div>
                      {cancelBookingId === b.id && renderCancelForm(b)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" id="schedule">
              <h3 className="card-title"><i className="ri-calendar-2-line"></i>Upcoming schedule</h3>
              {upcomingConfirmed.length === 0 ? (
                <p style={{ margin: 0 }}>You have no classes scheduled.</p>
              ) : (
                upcomingConfirmed.map(b => {
                  const d = fromISO(b.date);
                  return (
                    <div key={b.id}>
                      <div className="schedule-row">
                        <div className="schedule-date">
                          <p className="dow">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                          <p className="num">{d.getDate()}</p>
                        </div>
                        <div className="schedule-body">
                          <p style={{ fontWeight: 500, color: 'var(--text-dark)' }}>{b.parentName}</p>
                          <p style={{ fontSize: '0.85rem' }}>{b.startTime} - {b.endTime}</p>
                        </div>
                        {cancelBookingId !== b.id && <button onClick={() => openCancel(b.id)} className="btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>Cancel</button>}
                      </div>
                      {cancelBookingId === b.id && renderCancelForm(b)}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {bookings.some(b => b.status === 'cancelled' || (b.status === 'confirmed' && isPast(b.date))) && (
            <div className="table-card">
              <div className="table-card-head"><h3><i className="ri-history-line"></i>Past &amp; cancelled</h3></div>
              <div className="table-head"><span>Parent</span><span>Date &amp; time</span><span>Status</span><span style={{ textAlign: 'right' }}>Rating</span></div>
              {bookings.filter(b => b.status === 'cancelled' || (b.status === 'confirmed' && isPast(b.date))).map(b => (
                <div key={b.id}>
                  <div className="table-row">
                    <div><p style={{ fontWeight: 600 }}>{b.parentName}</p></div>
                    <span>{formatDate(b.date)} • {b.startTime} - {b.endTime}</span>
                    <span><span className={`pill ${STATUS_PILL[b.status] || 'pill-muted'}`}>{b.status === 'confirmed' ? 'Completed' : cap(b.status)}</span></span>
                    <span className="table-actions">{b.rating ? <span className="row-stars">{b.rating} <i className="ri-star-fill"></i></span> : <span className="muted">—</span>}</span>
                  </div>
                  <div className="row-extra">{renderExtras(b)}</div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ---------- PARENT ----------
  return (
    <div className="dash-shell dash-page">
      {sidebar}
      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>Welcome back, {firstName}</h1>
            <p>
              {upcomingConfirmed.length} upcoming class{upcomingConfirmed.length !== 1 ? 'es' : ''}
              {pending.length > 0 && ` · ${pending.length} waiting for confirmation`}
            </p>
          </div>
          <Link to="/search" className="btn-primary"><i className="ri-search-line"></i>Search Tutors</Link>
        </div>

        <div className="dash-row">
          {nextClass ? (
            <div className="next-card">
              <p className="eyebrow">Next class</p>
              <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                <div className="avatar-initials" style={{ width: 52, height: 52, borderRadius: 14, background: '#fff', color: 'var(--primary)' }}>{initials(nextClass.tutorName)}</div>
                <div>
                  <h3>{nextClass.tutorName}</h3>
                  {userData?.studentName && <p>For {userData.studentName}{userData.studentClass ? ` · ${userData.studentClass}` : ''}</p>}
                </div>
              </div>
              <div className="next-card-meta">
                <span><i className="ri-calendar-line"></i>{formatDate(nextClass.date)}</span>
                <span><i className="ri-time-line"></i>{nextClass.startTime} – {nextClass.endTime}</span>
                <span><i className="ri-home-4-line"></i>At home</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <Link to={`/tutor/${nextClass.tutorId}`} className="btn-primary btn-sm btn-light">View tutor</Link>
                <button onClick={() => openCancel(nextClass.id)} className="btn-primary btn-sm btn-line">Cancel</button>
              </div>
              {cancelBookingId === nextClass.id && <div style={{ color: 'var(--text-dark)' }}>{renderCancelForm(nextClass)}</div>}
            </div>
          ) : (
            <div className="placeholder-card">
              <p className="eyebrow" style={{ margin: 0 }}>Next class</p>
              <h3>No confirmed classes yet</h3>
              <p>Search for expert educators matching your child's needs.</p>
              <Link to="/search" className="btn-secondary" style={{ alignSelf: 'flex-start' }}>Search Tutors</Link>
            </div>
          )}

          {toRate ? (
            <div className="rate-card">
              <p className="eyebrow">Rate your last class</p>
              <h3>How was your class with {toRate.tutorName}?</h3>
              {rateBookingId === toRate.id ? renderRateForm(toRate) : (
                <>
                  {renderStars(0, (s) => { openRate(toRate.id); setRating(s); })}
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--warning-ink)' }}>{formatDate(toRate.date)} · {toRate.startTime} - {toRate.endTime}</p>
                </>
              )}
            </div>
          ) : (
            <div className="placeholder-card">
              <p className="eyebrow" style={{ margin: 0 }}>Reviews</p>
              <p>After a class is done you can rate the tutor here. Ratings help other parents choose.</p>
            </div>
          )}
        </div>

        <div className="table-card" id="bookings">
          <div className="table-card-head">
            <h3><i className="ri-calendar-check-line"></i>My Bookings</h3>
            <div className="seg">
              {['all', 'upcoming', 'past'].map(f => (
                <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{cap(f)}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '1.5rem 1.4rem' }}>
              <p style={{ margin: 0 }}>{bookings.length === 0 ? 'You have not booked any classes yet.' : 'Nothing here.'}</p>
            </div>
          ) : (
            <>
              <div className="table-head"><span>Tutor</span><span>Date &amp; time</span><span>Status</span><span style={{ textAlign: 'right' }}>Action</span></div>
              {filtered.map(b => (
                <div key={b.id}>
                  <div className="table-row">
                    <div><Link to={`/tutor/${b.tutorId}`} style={{ fontWeight: 600 }}>{b.tutorName}</Link></div>
                    <span>{formatDate(b.date)} • {b.startTime} - {b.endTime}</span>
                    <span><span className={`pill ${STATUS_PILL[b.status] || 'pill-muted'}`}>{cap(b.status)}</span></span>
                    <span className="table-actions">
                      {canRate(b) && rateBookingId !== b.id && cancelBookingId !== b.id && (
                        <button onClick={() => openRate(b.id)} className="btn-primary btn-sm" style={{ background: 'var(--warning)' }}>Rate Tutor</button>
                      )}
                      {canCancel(b) && cancelBookingId !== b.id && rateBookingId !== b.id && (
                        <button onClick={() => openCancel(b.id)} className="btn-danger btn-sm">Cancel</button>
                      )}
                    </span>
                  </div>
                  <div className="row-extra">
                    {renderExtras(b)}
                    {cancelBookingId === b.id && b.id !== nextClass?.id && renderCancelForm(b)}
                    {rateBookingId === b.id && b.id !== toRate?.id && renderRateForm(b)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
