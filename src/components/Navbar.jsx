import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  if (location.pathname === '/admin') return null;
  const { currentUser, userData } = useAuth();
  const isTutor = userData?.role === 'tutor';
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  const goHow = (e) => {
    if (!isHomePage) return;
    e.preventDefault();
    const el = document.querySelector('#how-it-works');
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
    setOpen(false);
  };

  const cls = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  const firstName = (userData?.name || currentUser?.email || '').split(/[\s@]/)[0];

  return (
    <nav className="navbar">
      <div className="nav-pill">
        <Link to="/" className="logo"><span className="logo-mark"><i className="ri-book-open-fill"></i></span>Tutrly</Link>

        <div className={`nav-links${open ? ' open' : ''}`}>
          {currentUser && !isTutor && <NavLink to="/search" className={cls}>Find tutors</NavLink>}
          {currentUser && <NavLink to="/dashboard" className={cls}>{isTutor ? 'Dashboard' : 'Bookings'}</NavLink>}
          {isTutor && <NavLink to="/edit-profile" className={cls}>Availability</NavLink>}
          <Link to="/" onClick={goHow} className="nav-link">How it works</Link>
          {userData?.role === 'admin' && <NavLink to="/admin" className={({ isActive }) => `nav-link nav-admin${isActive ? ' active' : ''}`}>Admin</NavLink>}
          {!currentUser && (
            <>
              <Link to="/login" state={{ isSignup: true, role: 'tutor' }} className="nav-link">Become a tutor</Link>
              <Link to="/login" className="btn btn-sm">Sign in</Link>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          <button onClick={toggleTheme} className="icon-btn" aria-label="Toggle theme">
            <i className={theme === 'light' ? 'ri-moon-line' : 'ri-sun-line'}></i>
          </button>
          {currentUser && (
            <Link to="/profile" className="nav-user" title="My Profile">
              <Avatar user={userData || { name: currentUser.email }} size={34} radius={17} />
              <span className="nm">{firstName}</span>
            </Link>
          )}
          <button className="icon-btn mobile-menu-btn" onClick={() => setOpen(o => !o)} aria-label="Menu">
            <i className={open ? 'ri-close-line' : 'ri-menu-line'}></i>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
