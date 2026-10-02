import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Mobile-only tab bar (CSS hides it above 768px). Signed-in users only.
const HIDDEN_ON = ['/login', '/setup-profile', '/tutor/', '/book/', '/admin'];

function BottomNav() {
  const { currentUser, userData } = useAuth();
  const { pathname } = useLocation();
  const isTutor = userData?.role === 'tutor';
  const visible = !!currentUser && !HIDDEN_ON.some(p => pathname.startsWith(p));

  useEffect(() => {
    document.body.classList.toggle('has-bottom-nav', visible);
    return () => document.body.classList.remove('has-bottom-nav');
  }, [visible]);

  if (!visible) return null;

  const items = isTutor
    ? [
        { to: '/', icon: 'ri-home-5', label: 'Home', end: true },
        { to: '/dashboard', icon: 'ri-dashboard', label: 'Dashboard' },
        { to: '/edit-profile', icon: 'ri-time', label: 'Availability' },
        { to: '/profile', icon: 'ri-user-3', label: 'Profile' }
      ]
    : [
        { to: '/', icon: 'ri-home-5', label: 'Home', end: true },
        { to: '/search', icon: 'ri-search', label: 'Search' },
        { to: '/dashboard', icon: 'ri-calendar-check', label: 'Bookings' },
        { to: '/profile', icon: 'ri-user-3', label: 'Profile' }
      ];

  return (
    <nav className="bottom-nav">
      {items.map(it => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          {({ isActive }) => (
            <>
              <i className={`${it.icon}-${isActive ? 'fill' : 'line'}`}></i>
              {it.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
