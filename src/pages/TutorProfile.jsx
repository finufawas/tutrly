import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Avatar from '../components/Avatar';
import { DAYS, classRange, nextOpenSlots, toISO, slotsFor, to12h } from '../utils/tutor';

function TutorProfile() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [tutor, setTutor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', tutorId));
        if (snap.exists() && snap.data().role === 'tutor') {
          setTutor({ id: snap.id, ...snap.data() });
          const q = query(collection(db, 'bookings'), where('tutorId', '==', tutorId), where('status', '==', 'completed'));
          const bSnap = await getDocs(q);
          const revs = [];
          bSnap.forEach(d => {
            const data = d.data();
            if (data.rating && data.review) revs.push({ id: d.id, ...data });
          });
          setReviews(revs);
        } else {
          setError('Tutor not found.');
        }
      } catch (err) {
        setError('Error loading tutor profile.');
      }
      setLoading(false);
    };
    fetchTutor();
  }, [tutorId]);

  if (loading) return <div className="page"><div className="spinner-container"><div className="spinner"></div></div></div>;
  if (!tutor) return <div className="page"><div className="container"><div className="alert alert-error"><i className="ri-error-warning-line"></i><p>{error}</p></div></div></div>;

  const isTutorViewer = userData?.role === 'tutor';
  const nextSlots = nextOpenSlots(tutor.availability, 3);
  const slotLink = (s) => `/book/${tutor.id}?date=${s.iso}&start=${s.start}&end=${s.end}`;
  const hasAvailability = tutor.availability && Object.values(tutor.availability).some(s => s?.length);

  // Next 7 days with open/closed state
  const now = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const iso = toISO(d);
    return { iso, d: d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1), n: d.getDate(), open: slotsFor(tutor.availability, iso).length > 0, today: i === 0 };
  });

  const bookingTile = (
    <div className="rate-tile tile-ink desktop-only">
      <p style={{ fontWeight: 700 }}>Hourly rate</p>
      <span className="big">₹{tutor.hourlyRate || 0}</span>
      {nextSlots.length > 0 && (
        <div className="slot-chips">
          {nextSlots.map(s => <Link key={s.iso + s.start} to={slotLink(s)} className="slot-chip">{s.label} {to12h(s.start)}</Link>)}
        </div>
      )}
      {isTutorViewer ? (
        <p style={{ fontWeight: 700 }}><i className="ri-error-warning-line"></i> Tutors cannot book classes with other tutors.</p>
      ) : (
        <Link to={`/book/${tutor.id}`} className="btn-on-ink">Book a Class <i className="ri-arrow-right-line"></i></Link>
      )}
    </div>
  );

  return (
    <div className="page has-cta">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}><i className="ri-arrow-left-line"></i>Back to results</button>

        <div className="profile-bento">
          <div className="profile-hero">
            <div className="photo"><Avatar user={tutor} size={250} radius={0} tint={false} /></div>
            <div className="info">
              {tutor.isVerified && <span className="verified-badge" style={{ alignSelf: 'flex-start' }}><i className="ri-shield-check-fill"></i>Verified by Tutrly</span>}
              <h1>{tutor.name}</h1>
              <p className="bio">{tutor.bio || 'This tutor has not added a bio yet.'}</p>
              <div className="tags">
                {tutor.subjects?.map(s => <span key={s} className="tag">{s}</span>)}
                {tutor.boards?.length > 0 && <span className="tag">{tutor.boards.join(' · ')}</span>}
              </div>
            </div>
          </div>

          {bookingTile}

          <div className="stat-tile tile-butter">
            <p className="eyebrow">Parent rating</p>
            <p className="big-num" style={{ fontSize: '4rem' }}>{tutor.rating ? Number(tutor.rating).toFixed(1) : 'New'}</p>
            <p style={{ fontWeight: 700 }}>{tutor.rating ? '★★★★★' : 'No reviews yet'}</p>
          </div>

          <div className="stat-tile tile-mint">
            <p className="eyebrow">Classes</p>
            <p className="big-num">{classRange(tutor.classLevels).replace('Class ', '')}</p>
          </div>

          <div className="tile tile-sky week-tile">
            <p className="eyebrow" style={{ marginBottom: '0.7rem' }}>Next 7 days</p>
            {!hasAvailability ? (
              <p style={{ fontWeight: 600 }}>No availability set</p>
            ) : (
              <>
                <div className="week-strip">
                  {week.map(w => (
                    <div key={w.iso} className={`week-cell${w.open ? ' open' : ''}${w.today ? ' today' : ''}`}><span>{w.d}</span><b>{w.n}</b></div>
                  ))}
                </div>
                <div className="slot-list">
                  {DAYS.map(day => {
                    const slots = tutor.availability[day];
                    if (!slots || slots.length === 0) return null;
                    return (
                      <div key={day} className="slot-list-row">
                        <b>{day}</b>
                        <div className="chip-row" style={{ gap: '0.3rem' }}>{slots.map((s, i) => <span key={i}>{to12h(s.start)} - {to12h(s.end)}</span>)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {reviews.length > 0 && (
            <div className="tile tile-peach" style={{ gridColumn: '1 / -1' }}>
              <p className="eyebrow" style={{ marginBottom: '1rem' }}>Parent Reviews</p>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '1rem' }}>
                    <p style={{ fontWeight: 800, color: 'var(--ink)', marginBottom: '0.2rem' }}>{r.parentName}</p>
                    <p className="row-stars" style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>
                      {[...Array(5)].map((_, i) => <i key={i} className={i < r.rating ? 'ri-star-fill' : 'ri-star-line'}></i>)}
                    </p>
                    <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--ink)' }}>"{r.review}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isTutorViewer && (
        <div className="mobile-cta">
          <div className="grow">
            <span className="price">₹{tutor.hourlyRate || 0}<small>/hr</small></span>
            {nextSlots[0] && <p>Next: {nextSlots[0].label} {to12h(nextSlots[0].start)}</p>}
          </div>
          <Link to={`/book/${tutor.id}`} className="btn-on-ink">Book a Class</Link>
        </div>
      )}
    </div>
  );
}

export default TutorProfile;
