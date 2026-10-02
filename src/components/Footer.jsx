import React from 'react';
import { useLocation, Link } from 'react-router-dom';

function Footer() {
  const location = useLocation();
  if (location.pathname === '/admin') return null;
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem 5%', background: 'var(--surface)', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', color: 'var(--text-light)', fontSize: '0.95rem' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>&copy; {new Date().getFullYear()} Tutrly. All rights reserved.</p>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontWeight: 500 }}>
          <a href="mailto:support@tutrly.com" style={{ color: 'var(--text-light)', textDecoration: 'none' }} onMouseOver={e => e.target.style.color='var(--ink)'} onMouseOut={e => e.target.style.color='var(--text-light)'}>Contact Support</a>
          <Link to="/privacy" style={{ color: 'var(--text-light)', textDecoration: 'none' }} onMouseOver={e => e.target.style.color='var(--ink)'} onMouseOut={e => e.target.style.color='var(--text-light)'}>Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
