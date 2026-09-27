import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import heroTutorImg from '../assets/images/hero_tutor.jpg';
import Avatar from '../components/Avatar';
import { classRange } from '../utils/tutor';

const POPULAR_SUBJECTS = [
  { name: 'Mathematics', icon: 'ri-calculator-line' },
  { name: 'Science', icon: 'ri-flask-line' },
  { name: 'English', icon: 'ri-quill-pen-line' },
  { name: 'Hindi', icon: 'ri-translate-2' },
  { name: 'Social Studies', icon: 'ri-earth-line' },
  { name: 'Computer Science', icon: 'ri-computer-line' }
];

function Home() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [board, setBoard] = useState(userData?.studentBoard?.[0] || '');
  const isTutor = userData?.role === 'tutor';
  const isGuest = !currentUser;

  const [featuredTutors, setFeaturedTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(true);

  useEffect(() => {
    if (userData?.studentClass && !classLevel) setClassLevel(userData.studentClass);
  }, [userData]);

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'tutor'),
          where('isVerified', '==', true)
        );
        const snapshot = await getDocs(q);
        const results = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.profileComplete) results.push({ id: doc.id, ...data });
        });
        setFeaturedTutors(results.slice(0, 4));
      } catch (err) {
        console.error('Error fetching tutors:', err);
      }
      setLoadingTutors(false);
    };
    fetchTutors();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (classLevel) params.set('class', classLevel);
    if (subject) params.set('subject', subject);
    if (board) params.set('board', board);
    navigate(`/search?${params.toString()}`);
  };

  const handleTutorClick = (tutorId) => {
    navigate(isGuest ? '/login' : `/tutor/${tutorId}`);
  };

  const subjectHref = (name) => (isGuest ? '/login' : `/search?subject=${encodeURIComponent(name)}`);

  return (
    <>
      <header className="hero" id="home">
        <div className="hero-content">
          <span className="badge">Classes 1 to 12</span>

          {isGuest ? (
            <>
              <h1>Find the Best Home <span className="highlight">Tutors</span></h1>
              <p>A platform connecting parents with verified home tutors. Personalized education, right at your doorstep.</p>
              <div className="hero-actions">
                <button className="btn-primary btn-lg" onClick={() => navigate('/login', { state: { isSignup: true, role: 'parent' } })}>
                  <i className="ri-user-add-line"></i> Join as Parent / Student
                </button>
                <button className="btn-secondary btn-lg" onClick={() => navigate('/login', { state: { isSignup: true, role: 'tutor' } })}>
                  <i className="ri-user-star-line"></i> Join as Tutor
                </button>
              </div>
            </>
          ) : isTutor ? (
            <>
              <h1>Grow Your Teaching <span className="highlight">Career</span></h1>
              <p>Connect with students in your area and manage your classes all in one place.</p>
              <div className="hero-actions">
                <button className="btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                  <i className="ri-dashboard-line"></i> Go to Dashboard
                </button>
                <button className="btn-outline btn-lg" onClick={() => navigate('/edit-profile')}>
                  <i className="ri-time-line"></i> Update Availability
                </button>
              </div>
            </>
          ) : (
            <>
              <h1>Unlock Your Child's Full <span className="highlight">Potential</span></h1>
              <p>Connect with expert home tutors tailored to your child's learning style. Personalized education right at your doorstep.</p>
              <form className="search-box" onSubmit={handleSearch}>
                <div className="search-field">
                  <label>Class</label>
                  <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
                    <option value="">Any class</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={`Class ${i + 1}`}>Class {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="search-field">
                  <label>Subject</label>
                  <input type="text" placeholder="e.g. Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="search-field">
                  <label>Board</label>
                  <select value={board} onChange={(e) => setBoard(e.target.value)}>
                    <option value="">Any board</option>
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State">State Board</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary search-btn"><i className="ri-search-line"></i> Find Tutor</button>
              </form>
            </>
          )}

          <div className="trust-strip">
            <span><i className="ri-shield-check-line" style={{ color: 'var(--success)' }}></i> Every tutor verified</span>
            <span><i className="ri-calendar-check-line" style={{ color: 'var(--secondary)' }}></i> Real-time availability</span>
            <span><i className="ri-home-heart-line" style={{ color: 'var(--primary)' }}></i> Classes at your home</span>
          </div>
        </div>
        <div className="hero-image">
          <img src={heroTutorImg} alt="Home Tutoring" />
        </div>
      </header>

      {/* What is Tutrly — only for guests */}
      {isGuest && (
        <section className="section">
          <div className="section-header">
            <h2>What is <span className="highlight">Tutrly</span>?</h2>
            <p>The simplest way to find trusted home tutors for your child</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <i className="ri-shield-check-line"></i>
              <h3>Verified Tutors</h3>
              <p>Every tutor is reviewed and verified by our team before they appear on the platform.</p>
            </div>
            <div className="feature-card">
              <i className="ri-calendar-schedule-line"></i>
              <h3>Easy Booking</h3>
              <p>Book classes instantly. See real-time availability and pick a slot that works for you.</p>
            </div>
            <div className="feature-card">
              <i className="ri-home-heart-line"></i>
              <h3>Home Tuition</h3>
              <p>Personalized one-on-one classes at your home. No commute, no hassle.</p>
            </div>
          </div>
        </section>
      )}

      {/* Popular subjects — parents & guests */}
      {!isTutor && (
        <section className="section" style={{ paddingTop: isGuest ? 0 : '1rem', paddingBottom: 0 }}>
          <div className="section-row"><h2>Popular subjects</h2></div>
          <div className="subject-chips">
            {POPULAR_SUBJECTS.map(s => (
              <Link key={s.name} to={subjectHref(s.name)} className="subject-chip">
                <i className={s.icon}></i>{s.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Browse Tutors — real tutors from Firestore (hidden for tutors) */}
      {!isTutor && (
        <section className="section" id="find-tutor">
          <div className="section-row">
            <h2>{isGuest ? 'Our Tutors' : 'Top Rated Tutors'}</h2>
            <Link to={isGuest ? '/login' : '/search'} className="link">{isGuest ? 'Sign in to see all →' : 'See all tutors →'}</Link>
          </div>

          {loadingTutors ? (
            <div className="spinner-container"><div className="spinner"></div></div>
          ) : featuredTutors.length === 0 ? (
            <div className="empty-state">
              <i className="ri-user-search-line"></i>
              <p>No verified tutors available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="tutor-mini-grid">
              {featuredTutors.map(tutor => (
                <div key={tutor.id} className="tutor-mini" onClick={() => handleTutorClick(tutor.id)}>
                  <div className="tutor-mini-head">
                    <Avatar user={tutor} size={52} />
                    <div style={{ minWidth: 0 }}>
                      <div className="tutor-mini-name">{tutor.name}<i className="ri-verified-badge-fill verified"></i></div>
                      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{classRange(tutor.classLevels)}</p>
                    </div>
                  </div>
                  <p className="tutor-mini-sub">{tutor.subjects?.join(', ') || 'No subjects listed'}</p>
                  <div className="tutor-mini-foot">
                    <span><i className="ri-star-fill star"></i> {tutor.rating ? tutor.rating.toFixed(1) : 'New'}</span>
                    <span style={{ fontWeight: 600 }}>{isGuest ? 'Sign in to view' : `₹${tutor.hourlyRate || 0}/hr`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* How It Works */}
      <section className="section" id="how-it-works">
        <div className="section-header">
          <h2>How Tutrly Works {isTutor ? 'for Tutors' : ''}</h2>
          <p>{isTutor ? 'Start earning by teaching students in your area' : 'Your journey to academic excellence in three simple steps'}</p>
        </div>
        <div className="steps-container">
          {(isGuest
            ? [
                ['Register', "Sign up as a Parent/Student or as a Tutor — it's completely free."],
                ['Find & Connect', 'Parents search for tutors by subject, class, and board. Tutors set up their profile and availability.'],
                ['Book a Class', 'Schedule a class with your preferred tutor and start learning.']
              ]
            : isTutor
            ? [
                ['Create Profile', 'Set up your subjects, class levels, and weekly availability schedule.'],
                ['Accept Bookings', 'Receive booking requests from parents and accept the ones that fit your schedule.'],
                ['Teach & Earn', 'Provide high-quality education, get great ratings, and grow your income.']
              ]
            : [
                ['Search & Filter', 'Find the perfect tutor based on class, subject, and your location.'],
                ['Book a Class', 'Schedule a class to ensure the perfect student-tutor match.'],
                ['Start Learning', 'Begin personalized home tuition and track progress regularly.']
              ]
          ).map(([title, text], i) => (
            <div className="step-card" key={title}>
              <div className="step-number">{i + 1}</div>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      {!isTutor && (
        <section className="cta-section" id="become-tutor">
          <h2>{isGuest ? 'Get Started Today' : 'Are you an expert educator?'}</h2>
          <p>{isGuest ? 'Join thousands of families finding the perfect tutor for their child.' : 'Join our platform, set your own schedule, and help students achieve their goals while earning.'}</p>
          <button
            className="btn-large"
            onClick={() => navigate('/login', { state: { isSignup: true, role: isGuest ? 'parent' : 'tutor' } })}
          >
            {isGuest ? 'Create Free Account' : 'Register as a Tutor'}
          </button>
        </section>
      )}
    </>
  );
}

export default Home;
