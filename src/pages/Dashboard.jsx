import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { formatDate, isPast, fromISO, toISO } from '../utils/tutor';

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

  useEffect(() => { fetchBookings(); }, [currentUser, userData, isTutor]);

  const handleAccept = async (id) => {
    try { await updateDoc(doc(db, 'bookings', id), { status: 'confirmed' }); fetchBookings(); }
    catch (err) { console.error('Error accepting booking:', err); alert('Failed to accept booking.'); }
  };

  const handleCancelSubmit = async (id) => {
    const words = cancelReason.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 10) { alert('Please provide a reason with at least 10 words.'); return; }
    try {
      await updateDoc(doc(db, 'bookings', id), { status: 'cancelled', cancelReason: cancelReason.trim() });
      setCancelBookingId(null); setCancelReason(''); fetchBookings();
    } catch (err) { console.error('Error cancelling booking:', err); alert('Failed to cancel booking.'); }
  };

  const handleRateSubmit = async (id) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { rating, review: review.trim() });
      setRateBookingId(null); setRating(5); setReview(''); fetchBookings();
    } catch (err) { console.error('Error rating booking:', err); alert('Failed to submit rating.'); }
  };

  const openCancel = (id) => { setRateBookingId(null); setCancelBookingId(id); setCancelReason(''); };
  const openRate = (id, stars = 5) => { setCancelBookingId(null); setRateBookingId(id); setRating(stars); setReview(''); };

  const pending = bookings.filter(b => b.status === 'pending');
  const upcoming = bookings.filter(b => b.status === 'confirmed' && !isPast(b.date));
  const nextClass = upcoming[0];
  const toRate = bookings.find(b => b.status === 'confirmed' && isPast(b.date) && !b.rating);
  const rated = bookings.filter(b => b.rating);
  const avgRating = rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : '—';
  const firstName = (userData?.name || '').split(' ')[0] || currentUser?.email;
  const child = userData?.studentName?.split(' ')[0];
  const daysUntil = (iso) => {
    const diff = Math.round((fromISO(iso) - fromISO(toISO(new Date()))) / 86400000);
    return diff <= 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`;
  };

  const filtered = bookings.filter(b =>
    filter === 'all' ? true : filter === 'upcoming' ? !isPast(b.date) && b.status !== 'cancelled' : isPast(b.date) || b.status === 'cancelled'
  );

  const renderCancelForm = (b) => {
    const words = cancelReason.trim().split(/\s+/).filter(w => w.length > 0);
    const ok = words.length >= 10;
    return (
      <div className="inline-form cancel">
        <p>Provide a reason for cancellation (Min 10 words):</p>
        <textarea className="textarea" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows="2"></textarea>
        <span className={ok ? 'count-ok' : 'count-bad'}>Word count: {words.length}/10</span>
        <div className="inline-actions">
          <button onClick={() => handleCancelSubmit(b.id)} disabled={!ok} className="btn btn-sm">Confirm Cancel</button>
          <button onClick={() => { setCancelBookingId(null); setCancelReason(''); }} className="btn-light btn-sm">Back</button>
        </div>
      </div>
    );
  };

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

  const renderExtras = (b) => (
    <>
      {b.message && <p className="row-note">"{b.message}"</p>}
      {b.status === 'cancelled' && b.cancelReason && <p className="row-reason">Reason: {b.cancelReason}</p>}
      {b.rating && (
        <p className="row-stars">
          {[...Array(5)].map((_, i) => <i key={i} className={i < b.rating ? 'ri-star-fill' : 'ri-star-line'}></i>)}
          {b.review && <span className="muted"> "{b.review}"</span>}
        </p>
      )}
    </>
  );

  if (loadingBookings && !bookings.length) {
    return <div className="page dash-page"><div className="spinner-container"><div className="spinner"></div></div></div>;
  }

  // ---------------- TUTOR ----------------
  if (isTutor) {
    const past = bookings.filter(b => b.status === 'cancelled' || (b.status === 'confirmed' && isPast(b.date)));
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
            <h1>Hi {firstName}{pending.length > 0 && <> <span className="accent">—</span> {pending.length} parent{pending.length > 1 ? 's are' : ' is'} waiting</>}</h1>
            <Link to="/edit-profile" className="btn"><i className="ri-time-line"></i>Edit Availability</Link>
          </div>

          <div className="stat-row">
            <div className="tile tile-peach"><p className="eyebrow">New requests</p><p className="big-num">{pending.length}</p></div>
            <div className="tile tile-mint"><p className="eyebrow">Upcoming classes</p><p className="big-num">{upcoming.length}</p></div>
            <div className="tile tile-butter"><p className="eyebrow">Rating</p><p className="big-num">{avgRating}</p></div>
            <div className="tile tile-sky"><p className="eyebrow">Hourly rate</p><p className="big-num">₹{userData?.hourlyRate || 0}</p></div>
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
                          <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatDate(b.date)} · {b.startTime} – {b.endTime}</p>
                          {b.message && <p className="row-note">"{b.message}"</p>}
                        </div>
                        {cancelBookingId !== b.id && (
                          <div className="row-actions">
                            <button onClick={() => openCancel(b.id)} className="btn-light btn-sm">Decline</button>
                            <button onClick={() => handleAccept(b.id)} className="btn btn-sm">Accept</button>
                          </div>
                        )}
                      </div>
                      {cancelBookingId === b.id && renderCancelForm(b)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="tile tile-lilac">
              <h3 style={{ marginBottom: '0.9rem' }}>Upcoming schedule</h3>
              {upcoming.length === 0 ? <p style={{ fontWeight: 600 }}>You have no classes scheduled.</p> : upcoming.map(b => {
                const d = fromISO(b.date);
                return (
                  <div key={b.id}>
                    <div className="schedule-item">
                      <div className="date-chip"><span>{d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</span><b>{d.getDate()}</b></div>
                      <div className="body"><p style={{ fontWeight: 800, color: 'var(--ink)' }}>{b.parentName}</p><p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{b.startTime} – {b.endTime}</p></div>
                      {cancelBookingId !== b.id && <button onClick={() => openCancel(b.id)} className="btn-soft btn-sm">Cancel</button>}
                    </div>
                    {cancelBookingId === b.id && <div style={{ marginTop: 8 }}>{renderCancelForm(b)}</div>}
                  </div>
                );
              })}
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
                    <span className="when">{formatDate(b.date)} · {b.startTime}</span>
                    <span className="status"><span className={`pill ${STATUS_PILL[b.status] || 'pill-muted'}`}>{b.status === 'confirmed' ? 'Completed' : cap(b.status)}</span></span>
                    <span className="row-actions">{b.rating ? <span className="row-stars">{b.rating} ★</span> : <span className="muted">—</span>}</span>
                  </div>
                  <div className="row-extra">{renderExtras(b)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------- PARENT ----------------
  return (
    <div className="page dash-page">
      <div className="container">
        <div className="dash-head">
          <h1>Hi {firstName}{child && <> <span className="accent">—</span> here's {child}'s week</>}</h1>
          <Link to="/search" className="btn"><i className="ri-search-line"></i>Find a tutor</Link>
        </div>

        <div className="dash-bento">
          {nextClass ? (
            <div className="next-tile">
              <div className="photo"><Avatar user={{ name: nextClass.tutorName }} size={180} radius={0} tint={false} /></div>
              <div className="info">
                <div>
                  <span className="dot-badge">● Confirmed · {daysUntil(nextClass.date)}</span>
                  <p className="when" style={{ marginTop: '0.8rem', color: 'var(--ink)' }}>{formatDate(nextClass.date)}<br />{nextClass.startTime} – {nextClass.endTime}</p>
                  <p className="who" style={{ marginTop: '0.4rem' }}>{nextClass.tutorName} · at home</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to={`/tutor/${nextClass.tutorId}`} className="btn btn-sm">View tutor</Link>
                  <button onClick={() => openCancel(nextClass.id)} className="btn-light btn-sm">Cancel</button>
                </div>
                {cancelBookingId === nextClass.id && renderCancelForm(nextClass)}
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
                  <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{formatDate(toRate.date)} · {toRate.startTime}</p>
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
                  <span className="when">{formatDate(b.date)} · {b.startTime} – {b.endTime}</span>
                  <span className="status"><span className={`pill ${STATUS_PILL[b.status] || 'pill-muted'}`}>{cap(b.status)}</span></span>
                  <span className="row-actions">
                    {b.status === 'confirmed' && !b.rating && rateBookingId !== b.id && cancelBookingId !== b.id && (
                      <button onClick={() => openRate(b.id)} className="btn btn-sm">Rate Tutor</button>
                    )}
                    {(b.status === 'pending' || b.status === 'confirmed') && cancelBookingId !== b.id && rateBookingId !== b.id && (
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
