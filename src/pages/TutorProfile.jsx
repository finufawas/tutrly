import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import Avatar from '../components/Avatar';
import { DAYS, DAYS_SHORT, classRange, availabilityGrid, nextOpenSlots } from '../utils/tutor';

function TutorProfile() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', tutorId));
        if (docSnap.exists() && docSnap.data().role === 'tutor') {
          setTutor({ id: docSnap.id, ...docSnap.data() });
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
  const hasAvailability = tutor.availability && Object.values(tutor.availability).some(s => s?.length);
  const grid = availabilityGrid(tutor.availability);
  const nextSlots = nextOpenSlots(tutor.availability, 3);
  const firstName = tutor.name?.split(' ')[0] || 'tutor';
  const slotLink = (s) => `/book/${tutor.id}?date=${s.iso}&start=${s.start}&end=${s.end}`;

  return (
    <div className="page has-cta-bar">
      <div className="container">
        <button className="back-link" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <i className="ri-arrow-left-line"></i> Back to results
        </button>

        <div className="profile-layout">
          <div className="profile-main">
            <div className="card profile-head">
              <Avatar user={tutor} size={132} radius={20} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <h1>{tutor.name}</h1>
                  {tutor.isVerified && <span className="pill pill-success"><i className="ri-shield-check-fill"></i>Verified</span>}
                </div>
                <p className="result-sub" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
                  {tutor.subjects?.join(' & ') || 'No subjects listed'} · {classRange(tutor.classLevels)}
                </p>
                <div className="profile-meta">
                  <span><i className="ri-star-fill star"></i> {tutor.rating ? <b>{tutor.rating.toFixed(1)}</b> : 'New Tutor'}</span>
                  {tutor.boards?.length > 0 && <span><i className="ri-book-2-line"></i> {tutor.boards.join(', ')}</span>}
                </div>
              </div>
            </div>

            <div className="tabs">
              <a href="#about" className="active">About</a>
              <a href="#availability">Availability</a>
            </div>

            <div className="card" id="about">
              <h3 className="card-title">About Me</h3>
              <p className="about-text">{tutor.bio || 'This tutor has not added a bio yet.'}</p>
              <div className="info-grid">
                <div>
                  <div className="eyebrow">Subjects</div>
                  <div className="chip-row">
                    {tutor.subjects?.length ? tutor.subjects.map(s => <span key={s} className="tag-subject">{s}</span>) : <span className="muted">None listed</span>}
                  </div>
                </div>
                <div>
                  <div className="eyebrow">Boards</div>
                  <div className="chip-row">
                    {tutor.boards?.length ? tutor.boards.map(b => <span key={b} className="tag-board">{b}</span>) : <span className="muted">None listed</span>}
                  </div>
                </div>
                <div>
                  <div className="eyebrow">Classes</div>
                  <div className="chip-row">
                    {tutor.classLevels?.length ? tutor.classLevels.map(c => <span key={c} className="tag-class">{c}</span>) : <span className="muted">None listed</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="card" id="availability">
              <h3 className="card-title">Weekly availability</h3>
              {!hasAvailability ? (
                <span className="muted">No availability set</span>
              ) : (
                <>
                  <div className="avail-grid">
                    <span></span>
                    {DAYS_SHORT.map(d => <span key={d} className="head">{d}</span>)}
                    {grid.map(row => (
                      <React.Fragment key={row.label}>
                        <span className="row-label">{row.label}</span>
                        {row.cells.map((on, i) => <span key={i} className={`avail-cell ${on ? 'on' : ''}`}></span>)}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="avail-legend">
                    <span><i style={{ background: 'var(--primary-100)' }}></i>Available</span>
                    <span><i style={{ background: 'var(--hover-bg)' }}></i>Unavailable</span>
                  </div>
                  <div className="slot-list">
                    {DAYS.map(day => {
                      const slots = tutor.availability[day];
                      if (!slots || slots.length === 0) return null;
                      return (
                        <div key={day} className="slot-list-row">
                          <b>{day}</b>
                          <div className="chip-row">
                            {slots.map((s, idx) => <span key={idx} className="slot-chip">{s.start} - {s.end}</span>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <aside className="card booking-card">
            <p className="price" style={{ margin: 0 }}>₹{tutor.hourlyRate || 0}<small> / hour</small></p>
            {nextSlots.length > 0 && (
              <div>
                <div className="eyebrow">Next open slots</div>
                <div className="next-slots">
                  {nextSlots.map(s => (
                    <Link key={s.iso + s.start} to={slotLink(s)} className="next-slot">{s.label} {s.start}</Link>
                  ))}
                </div>
              </div>
            )}
            {isTutorViewer ? (
              <div className="alert alert-error" style={{ margin: 0 }}>
                <i className="ri-error-warning-line"></i><p>Tutors cannot book classes with other tutors.</p>
              </div>
            ) : (
              <Link to={`/book/${tutor.id}`} className="btn-primary btn-lg btn-block">Book a Class</Link>
            )}
            <div className="trust-list">
              {tutor.isVerified && <span><i className="ri-shield-check-line"></i>Verified by the Tutrly team</span>}
              <span><i className="ri-home-heart-line"></i>Classes at your home</span>
            </div>
          </aside>
        </div>
      </div>

      {!isTutorViewer && (
        <div className="mobile-cta-bar">
          <div className="grow">
            <p className="price" style={{ fontSize: '1.25rem' }}>₹{tutor.hourlyRate || 0}<small>/hr</small></p>
            {nextSlots[0] && <p style={{ fontSize: '0.8rem' }}>Next: {nextSlots[0].label} {nextSlots[0].start}</p>}
          </div>
          <Link to={`/book/${tutor.id}`} className="btn-primary">Book {firstName}</Link>
        </div>
      )}
    </div>
  );
}

export default TutorProfile;
