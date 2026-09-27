import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { currentUser, userData } = useAuth();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const smoothScroll = (e, targetId) => {
    if (!isHomePage) return; // Let default routing happen if not on home
    e.preventDefault();
    const element = document.querySelector(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar" style={{ background: scrolled ? 'var(--glass-bg)' : 'transparent', boxShadow: scrolled ? 'var(--shadow-sm)' : 'none' }}>
      <div className="logo">
        <Link to="/" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="ri-book-open-line"></i> Tutrly
        </Link>
      </div>
      <div className="nav-links" style={{ display: mobileMenuOpen ? 'flex' : '' }}>
        <Link to="/" onClick={(e) => smoothScroll(e, '#home')}>Home</Link>
        <Link to={isHomePage ? "/" : "/"} onClick={(e) => smoothScroll(e, '#how-it-works')}>How it Works</Link>
        
        {userData?.role !== 'tutor' && (
          <Link to={isHomePage ? "/" : "/"} onClick={(e) => smoothScroll(e, '#find-tutor')}>Find Tutor</Link>
        )}
        
        {currentUser ? (
          <>
            {userData?.role === 'admin' && (
              <Link to="/admin" onClick={(e) => setMobileMenuOpen(false)} style={{ color: '#ef4444', fontWeight: 'bold' }}>Admin Panel</Link>
            )}
            <Link to="/profile" onClick={(e) => setMobileMenuOpen(false)}>My Profile</Link>
            <Link to="/dashboard" className="btn-primary" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
          </>
        ) : (
          <>
            <Link to="/login" state={{ isSignup: true, role: 'tutor' }} className="btn-secondary" onClick={() => setMobileMenuOpen(false)}>Become a Tutor</Link>
            <Link to="/login" className="btn-primary" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
          </>
        )}
        <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-dark)' }}>
          {theme === 'light' ? <i className="ri-moon-fill"></i> : <i className="ri-sun-fill"></i>}
        </button>
      </div>
      <div className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        <i className="ri-menu-line"></i>
      </div>
    </nav>
  );
}

export default Navbar;
