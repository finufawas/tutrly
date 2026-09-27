import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <h1 style={{ fontSize: '6rem', color: '#4F46E5', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ fontSize: '2rem', color: '#1E293B', marginBottom: '1rem' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: '2rem', maxWidth: '400px' }}>
        Oops! The page you are looking for doesn't exist. It might have been moved or deleted.
      </p>
      <Link to="/" className="btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
        Go Back Home
      </Link>
    </div>
  );
}

export default NotFound;
