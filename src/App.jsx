import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = () => {
    let message = 'Searching for tutors';
    if (classLevel) message += ` for Class ${classLevel}`;
    if (subject) message += ` teaching ${subject}`;
    
    document.querySelector('#find-tutor')?.scrollIntoView({ behavior: 'smooth' });
    console.log(message);
  };

  const smoothScroll = (e, targetId) => {
    e.preventDefault();
    const element = document.querySelector(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar" style={{ background: scrolled ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)', boxShadow: scrolled ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none' }}>
        <div className="logo">
          <i className="ri-book-open-line"></i> Tutrly
        </div>
        <div className="nav-links" style={{ display: mobileMenuOpen ? 'flex' : '' }}>
          <a href="#home" onClick={(e) => smoothScroll(e, '#home')}>Home</a>
          <a href="#how-it-works" onClick={(e) => smoothScroll(e, '#how-it-works')}>How it Works</a>
          <a href="#find-tutor" onClick={(e) => smoothScroll(e, '#find-tutor')}>Find Tutor</a>
          <a href="#become-tutor" className="btn-secondary" onClick={(e) => smoothScroll(e, '#become-tutor')}>Become a Tutor</a>
          <a href="#login" className="btn-primary" onClick={(e) => smoothScroll(e, '#home')}>Sign In</a>
        </div>
        <div className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <i className="ri-menu-line"></i>
        </div>
      </nav>

      <header className="hero" id="home">
        <div className="hero-content">
          <span className="badge">Classes 1 to 10</span>
          <h1>Unlock Your Child's Full <span className="highlight">Potential</span></h1>
          <p>Connect with expert home tutors tailored to your child's learning style. Personalized education right at your doorstep.</p>
          
          <div className="search-box">
            <div className="search-field">
              <i className="ri-graduation-cap-line"></i>
              <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
                <option value="">Select Class</option>
                {[1,2,3,4,5,6,7,8,9,10].map(c => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
            </div>
            <div className="search-divider"></div>
            <div className="search-field">
              <i className="ri-book-2-line"></i>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">Select Subject</option>
                <option value="math">Mathematics</option>
                <option value="science">Science</option>
                <option value="english">English</option>
                <option value="sst">Social Studies</option>
                <option value="hindi">Hindi</option>
              </select>
            </div>
            <button className="btn-primary search-btn" onClick={handleSearch}><i className="ri-search-line"></i> Find Tutor</button>
          </div>
        </div>
        <div className="hero-image">
          <img src="/assets/images/hero_tutor.jpg" alt="Home Tutoring" />
          <div className="floating-card rating-card">
            <div className="stars">
              <i className="ri-star-fill"></i><i className="ri-star-fill"></i><i className="ri-star-fill"></i><i className="ri-star-fill"></i><i className="ri-star-fill"></i>
            </div>
            <p>4.9/5 Average Rating</p>
          </div>
          <div className="floating-card subject-card">
            <i className="ri-function-line"></i>
            <div>
              <h4>Mathematics</h4>
              <p>Expert Tutors</p>
            </div>
          </div>
        </div>
      </header>

      <section className="how-it-works" id="how-it-works">
        <div className="section-header">
          <h2>How Tutrly Works</h2>
          <p>Your journey to academic excellence in three simple steps</p>
        </div>
        <div className="steps-container">
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
        </div>
      </section>

      <section className="featured-tutors" id="find-tutor">
        <div className="section-header">
          <h2>Top Rated Tutors</h2>
          <p>Learn from the best educators in your area</p>
        </div>
        <div className="tutors-grid">
          <div className="tutor-card">
            <div className="tutor-image"><img src="/assets/images/tutor_1.jpg" alt="Mr. Sharma" /><span className="tutor-badge">Verified</span></div>
            <div className="tutor-info">
              <div className="tutor-header"><h3>Mr. Rahul Sharma</h3><div className="rating"><i className="ri-star-fill"></i> 4.9</div></div>
              <p className="tutor-subject">Mathematics & Science</p>
              <p className="tutor-classes">Classes 6 to 10</p>
              <div className="tutor-footer"><span className="experience"><i className="ri-briefcase-4-line"></i> 5 Years Exp.</span><button className="btn-outline">View Profile</button></div>
            </div>
          </div>
          <div className="tutor-card">
            <div className="tutor-image"><img src="/assets/images/tutor_2.jpg" alt="Ms. Verma" /><span className="tutor-badge">Verified</span></div>
            <div className="tutor-info">
              <div className="tutor-header"><h3>Ms. Priya Verma</h3><div className="rating"><i className="ri-star-fill"></i> 4.8</div></div>
              <p className="tutor-subject">English & Social Studies</p>
              <p className="tutor-classes">Classes 1 to 8</p>
              <div className="tutor-footer"><span className="experience"><i className="ri-briefcase-4-line"></i> 3 Years Exp.</span><button className="btn-outline">View Profile</button></div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section" id="become-tutor">
        <div className="cta-content">
          <h2>Are you an expert educator?</h2>
          <p>Join our platform, set your own schedule, and help students achieve their goals while earning.</p>
          <button className="btn-primary btn-large">Register as a Tutor</button>
        </div>
      </section>

      <footer>
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo"><i className="ri-book-open-line"></i> Tutrly</div>
            <p>Connecting curious minds with expert home educators.</p>
            <div className="social-links">
              <a href="#"><i className="ri-facebook-fill"></i></a><a href="#"><i className="ri-twitter-fill"></i></a><a href="#"><i className="ri-instagram-fill"></i></a>
            </div>
          </div>
          <div className="footer-links">
            <h4>For Parents</h4><a href="#">Find a Tutor</a><a href="#">Request a Tutor</a><a href="#">Pricing</a>
          </div>
          <div className="footer-links">
            <h4>For Tutors</h4><a href="#">Join as Tutor</a><a href="#">Tutor Guidelines</a><a href="#">Success Stories</a>
          </div>
          <div className="footer-links">
            <h4>Company</h4><a href="#">About Us</a><a href="#">Contact Support</a><a href="#">Privacy Policy</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Tutrly. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

export default App;
