import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import heroTutorImg from '../assets/images/hero_tutor.jpg';
import Avatar from '../components/Avatar';
import TutorCard from '../components/TutorCard';
import { classRange } from '../utils/tutor';

const SUBJECTS = [
  { name: 'Mathematics', icon: 'ri-calculator-line', tint: 'tint-0' },
  { name: 'Science', icon: 'ri-flask-line', tint: 'tint-2' },
  { name: 'English', icon: 'ri-quill-pen-line', tint: 'tint-1' },
  { name: 'Hindi', icon: 'ri-translate-2', tint: 'tint-3' },
  { name: 'Social Studies', icon: 'ri-earth-line', tint: 'tint-4' },
  { name: 'Computer Science', icon: 'ri-computer-line', tint: 'tint-0' }
];

function Home() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const isTutor = userData?.role === 'tutor';
  const isGuest = !currentUser;
  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [board, setBoard] = useState('');
  const [featuredTutors, setFeaturedTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(true);

  useEffect(() => {
    if (userData?.studentClass) setClassLevel(c => c || userData.studentClass);
    if (userData?.studentBoard?.[0]) setBoard(b => b || userData.studentBoard[0]);
  }, [userData]);

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'tutor'), where('isVerified', '==', true));
        const snapshot = await getDocs(q);
        let results = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.profileComplete) results.push({ id: doc.id, ...data });
        });

        if (userData?.city && userData.role !== 'tutor') {
          const match = results.filter(t => t.city?.toLowerCase().trim() === userData.city.toLowerCase().trim());
          const others = results.filter(t => t.city?.toLowerCase().trim() !== userData.city.toLowerCase().trim());
          results = [...match, ...others];
        }

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

  const top = featuredTutors[0];
  const subjectHref = (name) => (isGuest ? '/login' : `/search?subject=${encodeURIComponent(name)}`);

  return (
    <>
      <header className="home-hero" id="home">
        <div className="hero-copy">
          <div className="stack-row">
            <div className="stack">
              {featuredTutors.slice(0, 3).map(t => <Avatar key={t.id} user={t} size={36} radius={18} />)}
            </div>
            <span>Verified tutors · Classes 1 to 12</span>
          </div>

          {isGuest ? (
            <>
              <h1>Find the Best Home <span className="accent">Tutors.</span></h1>
              <p>A platform connecting parents with verified home tutors. Personalized education, right at your doorstep.</p>
              <div className="hero-actions">
                <button className="btn btn-lg" onClick={() => navigate('/login', { state: { isSignup: true, role: 'parent' } })}>
                  <i className="ri-user-add-line"></i> Join as Parent / Student
                </button>
                <button className="btn-light btn-lg" onClick={() => navigate('/login', { state: { isSignup: true, role: 'tutor' } })}>
                  <i className="ri-user-star-line"></i> Join as Tutor
                </button>
              </div>
            </>
          ) : isTutor ? (
            <>
              <h1>Grow Your Teaching <span className="accent">Career.</span></h1>
              <p>Connect with students in your area and manage your classes all in one place.</p>
              <div className="hero-actions">
                <button className="btn btn-lg" onClick={() => navigate('/dashboard')}><i className="ri-macbook-line"></i> Manage My Classes</button>
                <button className="btn-light btn-lg" onClick={() => { navigator.clipboard.writeText(`Hi! I'm teaching ${userData?.subjects?.[0] || 'students'} in ${userData?.city || 'your area'}. Book a home class with me on Tutrly: ${window.location.origin}/tutor/${currentUser.uid}`); alert('Profile link copied! Share it on WhatsApp to get more students.'); }}><i className="ri-share-forward-line"></i> Share Profile</button>
              </div>
            </>
          ) : (
            <>
              <h1>Unlock your child's full <span className="accent">potential.</span></h1>
              <p>Connect with expert home tutors tailored to your child's learning style, right at your doorstep.</p>
              <form className="search-card" onSubmit={handleSearch}>
                <div className="search-fields">
                  <div className="search-field">
                    <label>Class</label>
                    <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
                      <option value="">Any class</option>
                      {[...Array(12)].map((_, i) => <option key={i + 1} value={`Class ${i + 1}`}>Class {i + 1}</option>)}
                    </select>
                  </div>
                  <div className="search-field">
                    <label>Subject</label>
                    <input type="text" placeholder="e.g. Maths" value={subject} onChange={(e) => setSubject(e.target.value)} />
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
                </div>
                <button type="submit" className="btn"><i className="ri-search-line"></i> Find tutor</button>
              </form>
            </>
          )}
        </div>

        <div className="hero-bento">
          <div className="hero-photo">
            <img className="cover" src={heroTutorImg} alt="Home tutoring" />
          </div>
          <div className="stat-tile tile-mint">
            <span className="icon"><i className="ri-shield-check-fill"></i></span>
            <div><p className="big-num">100%</p><p style={{ fontWeight: 700 }}>tutors verified</p></div>
          </div>
          <div className="stat-tile tile-peach">
            <p style={{ fontWeight: 700 }}>Classes at</p>
            <p className="big-num" style={{ fontSize: '2.1rem' }}>your home</p>
          </div>
          {!isTutor && (
            <div className="subjects-tile">
              {SUBJECTS.map(s => (
                <Link key={s.name} to={subjectHref(s.name)} className={`subject-pill ${s.tint}`}><i className={s.icon}></i>{s.name}</Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {isGuest && (
        <section className="section">
          <div className="section-row"><h2>What is <span className="accent">Tutrly</span>?</h2></div>
          <div className="features-grid">
            <div className="feature-tile tile-lilac"><i className="ri-shield-check-line"></i><h3>Verified Tutors</h3><p>Every tutor is reviewed and verified by our team before they appear on the platform.</p></div>
            <div className="feature-tile tile-sky"><i className="ri-calendar-schedule-line"></i><h3>Easy Booking</h3><p>Book classes instantly. See real-time availability and pick a slot that works for you.</p></div>
            <div className="feature-tile tile-butter"><i className="ri-home-heart-line"></i><h3>Home Tuition</h3><p>Personalized one-on-one classes at your home. No commute, no hassle.</p></div>
          </div>
        </section>
      )}

      {!isTutor && (
        <section className="section" id="find-tutor">
          <div className="section-row">
            <h2>{isGuest ? 'Our Tutors' : (userData?.city ? `Tutors near ${userData.city}` : 'Top Rated Tutors')}</h2>
            <Link to={isGuest ? '/login' : '/search'} className="link">{isGuest ? 'Sign in to see all →' : 'See all tutors →'}</Link>
          </div>
          {loadingTutors ? (
            <div className="spinner-container"><div className="spinner"></div></div>
          ) : featuredTutors.length === 0 ? (
            <div className="empty-state"><i className="ri-user-search-line"></i><p>No verified tutors available yet. Check back soon!</p></div>
          ) : (
            <div className="tutor-grid">
              {featuredTutors.map(t => <TutorCard key={t.id} tutor={t} locked={isGuest} />)}
            </div>
          )}
        </section>
      )}

      <section className="section" id="how-it-works">
        <div className="section-row">
          <h2>How Tutrly Works {isTutor ? 'for Tutors' : ''}</h2>
          <p style={{ fontWeight: 600 }}>{isTutor ? 'Start earning by teaching students in your area' : 'Your journey to academic excellence in three simple steps'}</p>
        </div>
        <div className="steps-grid">
          {(isGuest
            ? [['Register', "Sign up as a Parent/Student or as a Tutor — it's completely free."], ['Find & Connect', 'Parents search for tutors by subject, class, and board. Tutors set up their profile and availability.'], ['Book a Class', 'Schedule a class with your preferred tutor and start learning.']]
            : isTutor
            ? [['Create Profile', 'Set up your subjects, class levels, and weekly availability schedule.'], ['Accept Bookings', 'Receive booking requests from parents and accept the ones that fit your schedule.'], ['Teach & Earn', 'Provide high-quality education, get great ratings, and grow your income.']]
            : [['Search & Filter', 'Find the perfect tutor based on class, subject, and your location.'], ['Book a Class', 'Schedule a class to ensure the perfect student-tutor match.'], ['Start Learning', 'Begin personalized home tuition and track progress regularly.']]
          ).map(([title, text], i) => (
            <div className="step-tile" key={title}><span className="step-num">{i + 1}</span><h3>{title}</h3><p>{text}</p></div>
          ))}
        </div>
      </section>

      {!isTutor && (
        <section className="cta-tile" id="become-tutor">
          <h2>{isGuest ? 'Get Started Today' : 'Are you an expert educator?'}</h2>
          <p>{isGuest ? 'Join thousands of families finding the perfect tutor for their child.' : 'Join our platform, set your own schedule, and help students achieve their goals while earning.'}</p>
          <button className="btn-on-ink btn-lg" onClick={() => navigate('/login', { state: { isSignup: true, role: isGuest ? 'parent' : 'tutor' } })}>
            {isGuest ? 'Create Free Account' : 'Register as a Tutor'}
          </button>
        </section>
      )}
    </>
  );
}

export default Home;
