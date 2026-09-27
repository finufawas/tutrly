import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import Avatar from '../components/Avatar';
import { toISO, fromISO, weekdayOf, formatDate, slotsFor, overlaps, classRange } from '../utils/tutor';

const WINDOW_DAYS = 28; // how far ahead parents can book
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

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', tutorId));
        if (docSnap.exists()) setTutor({ id: docSnap.id, ...docSnap.data() });
        else setError('Tutor not found.');
      } catch (err) {
        setError('Error loading tutor details.');
      }
      setLoading(false);
    };
    fetchTutor();
  }, [tutorId]);

  // Upcoming days with how many slots the tutor has on each
  const days = useMemo(() => {
    if (!tutor) return [];
    const now = new Date();
    return Array.from({ length: WINDOW_DAYS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const iso = toISO(d);
      return { iso, dow: d.toLocaleDateString('en-IN', { weekday: 'short' }), num: d.getDate(), count: slotsFor(tutor.availability, iso).length };
    });
  }, [tutor]);

  // Default to the first available day
  useEffect(() => {
    if (!formData.date && days.length) {
      const first = days.find(d => d.count > 0);
      if (first) setFormData(f => ({ ...f, date: first.iso }));
    }
  }, [days]);

  // Jump the strip to the page containing the selected date
  useEffect(() => {
    const idx = days.findIndex(d => d.iso === formData.date);
    if (idx >= 0) setPage(Math.floor(idx / PAGE));
  }, [days.length]);

  const [bookedSlots, setBookedSlots] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!formData.date || !tutorId) return;
      try {
        const q = query(collection(db, 'bookings'), where('tutorId', '==', tutorId), where('date', '==', formData.date));
        const querySnapshot = await getDocs(q);
        const booked = [];
        querySnapshot.forEach((d) => {
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
    if (!currentUser) {
      alert('Please log in to book a class!');
      navigate('/login');
      return;
    }
    if (userData?.role === 'tutor') {
      alert('Tutor accounts cannot book classes.');
      return;
    }

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
  const pickDate = (iso) => setFormData({ ...formData, date: iso, startTime: '', endTime: '' });

  return (
    <div className="page has-cta-bar">
      <div className="container">
        <button className="back-link" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <i className="ri-arrow-left-line"></i> Back
        </button>

        <div className="book-layout">
          <form className="card book-form" onSubmit={handleSubmit}>
            <div>
              <h1>Book a Class with {tutor.name}</h1>
              <p style={{ margin: '0.3rem 0 0' }}>{tutor.subjects?.join(', ')} • {classRange(tutor.classLevels)}</p>
            </div>

            {error && <div className="alert alert-error" style={{ margin: 0 }}><i className="ri-error-warning-line"></i><p>{error}</p></div>}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <label className="field-label" style={{ margin: 0 }}>Select Date</label>
                <div className="strip-nav">
                  <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous week"><i className="ri-arrow-left-s-line"></i></button>
                  <span>{monthLabel}</span>
                  <button type="button" disabled={(page + 1) * PAGE >= days.length} onClick={() => setPage(p => p + 1)} aria-label="Next week"><i className="ri-arrow-right-s-line"></i></button>
                </div>
              </div>
              <div className="date-strip">
                {visibleDays.map(d => (
                  <button
                    type="button"
                    key={d.iso}
                    disabled={d.count === 0}
                    className={`date-cell ${d.count === 0 ? 'off' : ''} ${formData.date === d.iso ? 'selected' : ''}`}
                    onClick={() => pickDate(d.iso)}
                  >
                    <span className="dow">{d.dow}</span>
                    <span className="num">{d.num}</span>
                    <span className="note">{d.count === 0 ? 'Off' : `${d.count} slot${d.count > 1 ? 's' : ''}`}</span>
                  </button>
                ))}
              </div>
            </div>

            {formData.date && (
              availableSlots.length === 0 ? (
                <div className="alert alert-error" style={{ margin: 0 }}>
                  <i className="ri-calendar-close-line"></i><p>The tutor has not set any availability for {dayOfWeek}. Please select another date.</p>
                </div>
              ) : (
                <div>
                  <label className="field-label">Available Slots for {dayOfWeek}</label>
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
                          {(isBooked || isSelected) && <small>{isBooked ? 'Booked' : 'Selected'}</small>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}

            <div>
              <label className="field-label">Message to Tutor <span className="muted" style={{ fontWeight: 400 }}>(Optional)</span></label>
              <textarea
                className="textarea"
                rows="3"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="What specifically would you like help with?"
              ></textarea>
            </div>
          </form>

          <aside className="summary-card">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Avatar user={tutor} size={52} />
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-dark)' }}>{tutor.name}</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{tutor.subjects?.[0]}{userData?.studentClass ? ` · ${userData.studentClass}` : ''}</p>
                </div>
              </div>
              <div className="summary-rows">
                <div><span>Date</span><span>{formData.date ? formatDate(formData.date) : '—'}</span></div>
                <div><span>Time</span><span>{hasSelection ? `${formData.startTime} – ${formData.endTime}` : '—'}</span></div>
                <div><span>Where</span><span>Your home</span></div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-dark)' }}>Rate</span><span>₹{tutor.hourlyRate || 0} / hr</span>
                </div>
              </div>
              <button type="button" className="btn-primary btn-lg btn-block" disabled={booking || !hasSelection} onClick={handleSubmit}>
                {booking ? 'Booking...' : 'Confirm Booking'}
              </button>
              <button type="button" className="btn-ghost btn-block" onClick={() => navigate(-1)}>Cancel</button>
            </div>
            <p className="summary-note">The tutor will confirm your request. You can cancel from your dashboard at any time.</p>
          </aside>
        </div>
      </div>

      <div className="mobile-cta-bar">
        <div className="grow">
          <p style={{ fontSize: '0.85rem' }}>{hasSelection ? `${formatDate(formData.date)} · ${formData.startTime}` : 'Pick a slot'}</p>
          <p style={{ fontWeight: 600, color: 'var(--text-dark)' }}>₹{tutor.hourlyRate || 0} / hr</p>
        </div>
        <button type="button" className="btn-primary" disabled={booking || !hasSelection} onClick={handleSubmit}>
          {booking ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}

export default BookDemo;
