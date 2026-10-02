import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LogoMark } from './Logo';

function Footer() {
  const location = useLocation();
  if (location.pathname === '/admin') return null;
  return (
    <footer className="site-footer">
      <div className="footer-pill">
        <LogoMark size={26} />
        <p>&copy; {new Date().getFullYear()} Tutrly. All rights reserved.</p>
        <div className="footer-links-row">
          <a href="mailto:support@tutrly.com" className="nav-link">Contact support</a>
          <Link to="/privacy" className="nav-link soft">Privacy policy</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
