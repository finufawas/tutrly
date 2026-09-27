import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import Avatar from '../components/Avatar';
import { toISO, fromISO, weekdayOf, formatDate, slotsFor, overlaps, classRange } from '../utils/tutor';

const WINDOW_DAYS = 28;
const PAGE = 7;

function BookDemo() {
  const { tutorId } = useParams();
  const [searchParams] = useSearchParams();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [formData, setFormData] = useState({
    date: searchParams.get('date') || '',
    startTime: searchParams.get('start') || '',
    endTime: searchParams.get('end') || '',
    message: ''
  });
  const [bookedSlots, setBookedSlots] = useState([]);

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', tutorId));
        if (snap.exists()) setTutor({ id: snap.id, ...snap.data() });
        else setError('Tutor not found.');
      } catch (err) {
        setError('Error loading tutor details.');
      }
      setLoading(false);
    };
    fetchTutor();
  }, [tutorId]);

  const days = useMemo(() => {
    if (!tutor) return [];
    const now = new Date();
    return Array.from({ length: WINDOW_DAYS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const iso = toISO(d);
      return { iso, dow: d.toLocaleDateString('en-IN', { weekday: 'short' }), num: d.getDate(), count: slotsFor(tutor.availability, iso).length };
    });
  }, [tutor]);

  useEffect(() => {
    if (!formData.date && days.length) {
      const first = days.find(d => d.count > 0);
      if (first) setFormData(f => ({ ...f, date: first.iso }));
    }
  }, [days]);

  useEffect(() => {
    const idx = days.findIndex(d => d.iso === formData.date);
    if (idx >= 0) setPage(Math.floor(idx / PAGE));
  }, [days.length]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!formData.date || !tutorId) return;
      try {
        const q = query(collection(db, 'bookings'), where('tutorId', '==', tutorId), where('date', '==', formData.date));
        const snap = await getDocs(q);
        const booked = [];
        snap.forEach((d) => {
          const b = d.data();
          if (b.status !== 'cancelled') booked.push({ start: b.startTime, end: b.endTime });
        });
        setBookedSlots(booked);
      } catch (err) {
        console.error('Error fetching bookings:', err);
      }
    };
    fetchBookings();
  }, [formData.date, tutorId]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!currentUser) { alert('Please log in to book a class!'); navigate('/login'); return; }
    if (userData?.role === 'tutor') { alert('Tutor accounts cannot book classes.'); return; }
    setBooking(true);
    setError('');
    try {
      if (!formData.date) throw new Error('Please select a date.');
      if (!formData.startTime || !formData.endTime) throw new Error('Please select a time slot.');
      if (formData.startTime >= formData.endTime) throw new Error('End time must be after start time.');
      if (overlaps({ start: formData.startTime, end: formData.endTime }, bookedSlots)) {
        throw new Error('The tutor is already booked during this time range. Please select another time.');
      }
      await addDoc(collection(db, 'bookings'), {
        tutorId,
        tutorName: tutor.name,
        parentId: currentUser.uid,
        parentName: userData?.name || 'Unknown Parent',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        message: formData.message,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      alert('Class booked successfully! The tutor will contact you soon.');
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to book: ' + err.message);
      setBooking(false);
    }
  };

  if (loading) return <div className="page"><div className="spinner-container"><div className="spinner"></div></div></div>;
  if (!tutor) return <div className="page"><div className="container"><div className="alert alert-error"><i className="ri-error-warning-line"></i><p>{error}</p></div></div></div>;

  const dayOfWeek = formData.date ? weekdayOf(formData.date) : '';
  const availableSlots = formData.date ? slotsFor(tutor.availability, formData.date) : [];
  const visibleDays = days.slice(page * PAGE, page * PAGE + PAGE);
  const monthLabel = visibleDays[0] ? fromISO(visibleDays[0].iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '';
  const hasSelection = formData.date && formData.startTime;
  const firstName = tutor.name?.split(' ')[0];
  const pickDate = (iso) => setFormData({ ...formData, date: iso, startTime: '', endTime: '' });

  return (
    <div className="page has-cta">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}><i className="ri-close-line"></i>Cancel</button>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', marginBottom: '1.5rem' }}>Book a Class with <span className="accent">{firstName}</span></h1>

        {error && <div className="alert alert-error"><i className="ri-error-warning-line"></i><p>{error}</p></div>}

        <div className="book-bento">
          <div className="book-main">
            <div className="tile">
              <div className="row-between">
                <h3>Pick a day</h3>
                <div className="strip-nav">
                  <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous week"><i className="ri-arrow-left-s-line"></i></button>
                  <span>{monthLabel}</span>
                  <button type="button" disabled={(page + 1) * PAGE >= days.length} onClick={() => setPage(p => p + 1)} aria-label="Next week"><i className="ri-arrow-right-s-line"></i></button>
                </div>
              </div>
              <div className="date-grid">
                {visibleDays.map((d, i) => (
                  <button
                    type="button"
                    key={d.iso}
                    disabled={d.count === 0}
                    className={`date-cell ${d.count === 0 ? 'off' : `t${i % 5}`} ${formData.date === d.iso ? 'selected' : ''}`}
                    onClick={() => pickDate(d.iso)}
                  >
                    <span className="dow">{d.dow}</span>
                    <span className="num">{d.num}</span>
                    <span className="note">{d.count === 0 ? 'Off' : `${d.count} slot${d.count > 1 ? 's' : ''}`}</span>
                  </button>
                ))}
              </div>

              <h3>Pick a time {dayOfWeek && <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 600 }}>· {dayOfWeek}</span>}</h3>
              {formData.date && availableSlots.length === 0 ? (
                <div className="alert alert-warning" style={{ margin: 0 }}><i className="ri-calendar-close-line"></i><p>The tutor has not set any availability for {dayOfWeek}. Please select another date.</p></div>
              ) : (
                <div className="slot-grid">
                  {availableSlots.map((slot, idx) => {
                    const isSelected = formData.startTime === slot.start && formData.endTime === slot.end;
                    const isBooked = overlaps(slot, bookedSlots);
                    return (
                      <button
                        type="button"
                        key={idx}
                        disabled={isBooked}
                        className={`slot ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, startTime: slot.start, endTime: slot.end })}
                        title={isBooked ? 'This slot is already booked' : ''}
                      >
                        {slot.start} – {slot.end}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="tile tile-mint" style={{ gap: '0.6rem' }}>
              <p className="eyebrow">Message to Tutor (optional)</p>
              <textarea className="textarea" style={{ background: 'var(--surface)' }} rows="3" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="What specifically would you like help with?"></textarea>
            </div>
          </div>

          <aside className="summary-tile">
            <div className="photo"><Avatar user={tutor} size={190} radius={0} tint={false} /></div>
            <div style={{ padding: '0 10px' }}>
              <p style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>{tutor.name}</p>
              <p style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{tutor.subjects?.join(', ')} · {classRange(tutor.classLevels)}</p>
            </div>
            <div className="summary-rows">
              <div><span>Date</span><span>{formData.date ? formatDate(formData.date) : '—'}</span></div>
              <div><span>Time</span><span>{hasSelection ? `${formData.startTime} – ${formData.endTime}` : '—'}</span></div>
              <div><span>Where</span><span>Your home</span></div>
              <div className="total"><span style={{ color: 'var(--ink)' }}>Rate</span><span>₹{tutor.hourlyRate || 0} / hr</span></div>
            </div>
            <button type="button" className="btn" disabled={booking || !hasSelection} onClick={handleSubmit}>
              {booking ? 'Booking...' : <>Confirm Booking <i className="ri-arrow-right-line"></i></>}
            </button>
          </aside>
        </div>
      </div>

      <div className="mobile-cta">
        <div className="grow">
          <span className="price" style={{ fontSize: '1rem' }}>{hasSelection ? `${formatDate(formData.date)} · ${formData.startTime}` : 'Pick a slot'}</span>
          <p>₹{tutor.hourlyRate || 0} / hr · at home</p>
        </div>
        <button type="button" className="btn-on-ink" disabled={booking || !hasSelection} onClick={handleSubmit}>{booking ? 'Booking...' : 'Confirm Booking'}</button>
      </div>
    </div>
  );
}

export default BookDemo;
