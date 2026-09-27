import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/tutor';

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { currentUser, userData } = useAuth();
  const isTutor = userData?.role === 'tutor';

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const smoothScroll = (e, targetId) => {
    if (!isHomePage) return;
    e.preventDefault();
    const element = document.querySelector(targetId);
    if (element) window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const close = () => setMobileMenuOpen(false);

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <i className="ri-book-open-line"></i> Tutrly
      </Link>

      <div className="nav-links" style={{ display: mobileMenuOpen ? 'flex' : '' }}>
        {/* Find Tutors — only for logged-in parents, not guests or tutors */}
        {currentUser && !isTutor && (
          <NavLink to="/search" onClick={close}>Find Tutors</NavLink>
        )}
        <Link to="/" onClick={(e) => smoothScroll(e, '#how-it-works')}>How it Works</Link>

        {currentUser ? (
          <>
            {userData?.role === 'admin' && (
              <NavLink to="/admin" onClick={close} className="nav-admin">Admin Panel</NavLink>
            )}
            <NavLink to="/dashboard" onClick={close}>{isTutor ? 'Dashboard' : 'My Bookings'}</NavLink>
            <button onClick={toggleTheme} className="icon-btn" aria-label="Toggle theme">
              {theme === 'light' ? <i className="ri-moon-line"></i> : <i className="ri-sun-line"></i>}
            </button>
            <Link to="/profile" onClick={close} className="nav-avatar" title="My Profile">
              {initials(userData?.name || currentUser.email)}
            </Link>
          </>
        ) : (
          <>
            <button onClick={toggleTheme} className="icon-btn" aria-label="Toggle theme">
              {theme === 'light' ? <i className="ri-moon-line"></i> : <i className="ri-sun-line"></i>}
            </button>
            <Link to="/login" state={{ isSignup: true, role: 'tutor' }} className="btn-secondary" onClick={close}>Become a Tutor</Link>
            <Link to="/login" className="btn-primary" onClick={close}>Sign In</Link>
          </>
        )}
      </div>

      <div className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        <i className={mobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'}></i>
      </div>
    </nav>
  );
}

export default Navbar;
