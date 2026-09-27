import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import heroTutorImg from '../assets/images/hero_tutor.jpg';
import tutorPlaceholder from '../assets/images/tutor_1.jpg';

function Home() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');
  const isTutor = userData?.role === 'tutor';
  const isGuest = !currentUser;

  // Fetch real tutors from Firestore
  const [featuredTutors, setFeaturedTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(true);

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
          if (data.profileComplete) {
            results.push({ id: doc.id, ...data });
          }
        });
        // Show up to 4 tutors
        setFeaturedTutors(results.slice(0, 4));
      } catch (err) {
        console.error('Error fetching tutors:', err);
      }
      setLoadingTutors(false);
    };
    fetchTutors();
  }, []);

  const handleSearch = () => {
    navigate(`/search?class=${encodeURIComponent(classLevel)}&subject=${encodeURIComponent(subject)}`);
  };

  const handleTutorClick = (tutorId) => {
    if (isGuest) {
      navigate('/login');
    } else {
      navigate(`/tutor/${tutorId}`);
    }
  };

  return (
    <>
      <header className="hero" id="home">
        <div className="hero-content">
          <span className="badge">Classes 1 to 12</span>
          
          {isGuest ? (
            <>
              <h1>Find the Best Home <span className="highlight">Tutors</span></h1>
              <p>A platform connecting parents with verified home tutors. Personalized education, right at your doorstep.</p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
                <button className="btn-primary btn-large" onClick={() => navigate('/login', { state: { isSignup: true, role: 'parent' } })} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                  <i className="ri-user-add-line"></i> Join as Parent / Student
                </button>
                <button className="btn-secondary btn-large" onClick={() => navigate('/login', { state: { isSignup: true, role: 'tutor' } })} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                  <i className="ri-user-star-line"></i> Join as Tutor
                </button>
              </div>
            </>
          ) : isTutor ? (
            <>
              <h1>Grow Your Teaching <span className="highlight">Career</span></h1>
              <p>Connect with students in your area and manage your classes all in one place.</p>
              <div style={{ marginTop: '2rem' }}>
                <button className="btn-primary btn-large" onClick={() => navigate('/dashboard')} style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}>
                  <i className="ri-dashboard-line"></i> Go to Dashboard
                </button>
              </div>
            </>
          ) : (
            <>
              <h1>Unlock Your Child's Full <span className="highlight">Potential</span></h1>
              <p>Connect with expert home tutors tailored to your child's learning style. Personalized education right at your doorstep.</p>
              <div className="search-box">
                <div className="search-field">
                  <i className="ri-graduation-cap-line"></i>
                  <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
                    <option value="">Select Class</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={`Class ${i+1}`}>Class {i+1}</option>
                    ))}
                  </select>
                </div>
                <div className="search-divider"></div>
                <div className="search-field">
                  <i className="ri-book-2-line"></i>
                  <input 
                    type="text" 
                    placeholder="Subject (e.g. Math)" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '1rem', width: '100%', color: 'var(--text-dark)' }}
                  />
                </div>
                <button className="btn-primary search-btn" onClick={handleSearch}><i className="ri-search-line"></i> Find Tutor</button>
              </div>
            </>
          )}
        </div>
        <div className="hero-image">
          <img src={heroTutorImg} alt="Home Tutoring" />
        </div>
      </header>

      {/* What is Tutrly — only for guests */}
      {isGuest && (
        <section style={{ background: 'var(--white)' }}>
          <div className="section-header">
            <h2>What is <span className="highlight">Tutrly</span>?</h2>
            <p>The simplest way to find trusted home tutors for your child</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
              <i className="ri-shield-check-fill" style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '1rem', display: 'block' }}></i>
              <h3>Verified Tutors</h3>
              <p>Every tutor is reviewed and verified by our team before they appear on the platform.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
              <i className="ri-calendar-schedule-fill" style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '1rem', display: 'block' }}></i>
              <h3>Easy Booking</h3>
              <p>Book free demo classes instantly. See real-time availability and pick a slot that works for you.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
              <i className="ri-home-heart-fill" style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '1rem', display: 'block' }}></i>
              <h3>Home Tuition</h3>
              <p>Personalized one-on-one classes at your home. No commute, no hassle.</p>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-header">
          <h2>How Tutrly Works {isTutor ? 'for Tutors' : isGuest ? '' : ''}</h2>
          <p>{isTutor ? 'Start earning by teaching students in your area' : 'Your journey to academic excellence in three simple steps'}</p>
        </div>
        <div className="steps-container">
          {isGuest ? (
            /* Guest: combined view */
            <>
              <div className="step-card">
                <div className="step-icon"><i className="ri-user-add-line"></i><div className="step-number">1</div></div>
                <h3>Register</h3>
                <p>Sign up as a Parent/Student or as a Tutor — it's completely free.</p>
              </div>
              <div className="step-card">
                <div className="step-icon"><i className="ri-search-eye-line"></i><div className="step-number">2</div></div>
                <h3>Find & Connect</h3>
                <p>Parents search for tutors by subject, class, and board. Tutors set up their profile and availability.</p>
              </div>
              <div className="step-card">
                <div className="step-icon"><i className="ri-calendar-check-line"></i><div className="step-number">3</div></div>
                <h3>Book a Demo</h3>
                <p>Schedule a free demo class. If it's a match, start regular home tuition.</p>
              </div>
            </>
          ) : isTutor ? (
            <>
              <div className="step-card">
                <div className="step-icon"><i className="ri-profile-line"></i><div className="step-number">1</div></div>
                <h3>Create Profile</h3>
                <p>Set up your subjects, class levels, and weekly availability schedule.</p>
              </div>
              <div className="step-card">
                <div className="step-icon"><i className="ri-check-double-line"></i><div className="step-number">2</div></div>
                <h3>Accept Demos</h3>
                <p>Receive booking requests from parents and accept the ones that fit your schedule.</p>
              </div>
              <div className="step-card">
                <div className="step-icon"><i className="ri-money-dollar-circle-line"></i><div className="step-number">3</div></div>
                <h3>Teach & Earn</h3>
                <p>Provide high-quality education, get great ratings, and grow your income.</p>
              </div>
            </>
          ) : (
            <>
              <div className="step-card">
                <div className="step-icon"><i className="ri-search-eye-line"></i><div className="step-number">1</div></div>
                <h3>Search & Filter</h3>
                <p>Find the perfect tutor based on class, subject, and your location.</p>
              </div>
              <div className="step-card">
                <div className="step-icon"><i className="ri-calendar-check-line"></i><div className="step-number">2</div></div>
                <h3>Book a Demo</h3>
                <p>Schedule a free demo class to ensure the perfect student-tutor match.</p>
              </div>
              <div className="step-card">
                <div className="step-icon"><i className="ri-line-chart-line"></i><div className="step-number">3</div></div>
                <h3>Start Learning</h3>
                <p>Begin personalized home tuition and track progress regularly.</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Browse Tutors — real tutors from Firestore (hidden for tutors) */}
      {!isTutor && (
        <section className="featured-tutors" id="find-tutor">
          <div className="section-header">
            <h2>{isGuest ? 'Our Tutors' : 'Top Rated Tutors'}</h2>
            <p>{isGuest ? 'Meet some of our verified educators' : 'Learn from the best educators in your area'}</p>
          </div>
          
          {loadingTutors ? (
            <div className="spinner-container"><div className="spinner"></div></div>
          ) : featuredTutors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
              <i className="ri-user-search-line" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}></i>
              <p>No verified tutors available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="tutors-grid">
              {featuredTutors.map(tutor => (
                <div key={tutor.id} className="tutor-card" onClick={() => handleTutorClick(tutor.id)} style={{ cursor: 'pointer' }}>
                  <div className="tutor-image">
                    <img src={tutor.photoURL || tutorPlaceholder} alt={tutor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span className="tutor-badge">Verified</span>
                  </div>
                  <div className="tutor-info">
                    <div className="tutor-header">
                      <h3>{tutor.name}</h3>
                      <div className="rating"><i className="ri-star-fill"></i> New</div>
                    </div>
                    <p className="tutor-subject">{tutor.subjects?.join(', ') || 'No subjects listed'}</p>
                    <p className="tutor-classes">{tutor.classLevels?.join(', ') || 'No classes listed'}</p>
                    <div className="tutor-footer">
                      <span className="experience" style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>
                        ₹{tutor.hourlyRate || 0} / hr
                      </span>
                      <button className="btn-outline" onClick={(e) => { e.stopPropagation(); handleTutorClick(tutor.id); }}>
                        {isGuest ? 'Sign In to View' : 'View Profile'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CTA Section */}
      {!isTutor && (
        <section className="cta-section" id="become-tutor">
          <div className="cta-content">
            <h2>{isGuest ? 'Get Started Today' : 'Are you an expert educator?'}</h2>
            <p>{isGuest ? 'Join thousands of families finding the perfect tutor for their child.' : 'Join our platform, set your own schedule, and help students achieve their goals while earning.'}</p>
            <button 
              className="btn-primary btn-large" 
              onClick={() => navigate('/login', { state: { isSignup: true, role: isGuest ? 'parent' : 'tutor' } })}
            >
              {isGuest ? 'Create Free Account' : 'Register as a Tutor'}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export default Home;
