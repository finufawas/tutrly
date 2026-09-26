import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heroTutorImg from '../assets/images/hero_tutor.jpg';
import tutor1Img from '../assets/images/tutor_1.jpg';
import tutor2Img from '../assets/images/tutor_2.jpg';

function Home() {
  const navigate = useNavigate();
  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');

  const handleSearch = () => {
    navigate(`/search?class=${encodeURIComponent(classLevel)}&subject=${encodeURIComponent(subject)}`);
  };

  return (
    <>
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
                <option value="Class 1-5">Class 1-5</option>
                <option value="Class 6-8">Class 6-8</option>
                <option value="Class 9-10">Class 9-10</option>
              </select>
            </div>
            <div className="search-divider"></div>
            <div className="search-field">
              <i className="ri-book-2-line"></i>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">Select Subject</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="English">English</option>
                <option value="Social Studies">Social Studies</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
            <button className="btn-primary search-btn" onClick={handleSearch}><i className="ri-search-line"></i> Find Tutor</button>
          </div>
        </div>
        <div className="hero-image">
          <img src={heroTutorImg} alt="Home Tutoring" />
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
            <div className="tutor-image"><img src={tutor1Img} alt="Mr. Sharma" /><span className="tutor-badge">Verified</span></div>
            <div className="tutor-info">
              <div className="tutor-header"><h3>Mr. Rahul Sharma</h3><div className="rating"><i className="ri-star-fill"></i> 4.9</div></div>
              <p className="tutor-subject">Mathematics & Science</p>
              <p className="tutor-classes">Classes 6 to 10</p>
              <div className="tutor-footer"><span className="experience"><i className="ri-briefcase-4-line"></i> 5 Years Exp.</span><button className="btn-outline">View Profile</button></div>
            </div>
          </div>
          <div className="tutor-card">
            <div className="tutor-image"><img src={tutor2Img} alt="Ms. Verma" /><span className="tutor-badge">Verified</span></div>
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
          <button 
            className="btn-primary btn-large" 
            onClick={() => navigate('/login', { state: { isSignup: true, role: 'tutor' } })}
          >
            Register as a Tutor
          </button>
        </div>
      </section>
    </>
  );
}

export default Home;
