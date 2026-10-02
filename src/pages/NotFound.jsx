import React from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/Logo';

function NotFound() {
  return (
    <div className="page">
      <div className="nf">
        <div className="nf-tile">
          <div className="nf-mark"><LogoMark size={96} /><span>404</span></div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)' }}>This page isn't home</h1>
          <p>The page you are looking for doesn't exist. It might have been moved or deleted.</p>
        </div>
        <Link to="/" className="btn btn-lg btn-block">Go back home</Link>
        <Link to="/search" className="btn-light btn-lg btn-block">Find a tutor</Link>
      </div>
    </div>
  );
}

export default NotFound;
