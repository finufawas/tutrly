import React from 'react';

function Footer() {
  return (
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
          <h4>For Parents</h4><span style={{color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem'}}>Find a Tutor</span><span style={{color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem'}}>Request a Tutor</span><span style={{color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem'}}>Pricing (Coming Soon)</span>
        </div>
        <div className="footer-links">
          <h4>For Tutors</h4><span style={{color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem'}}>Join as Tutor</span><span style={{color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem'}}>Tutor Guidelines</span><span style={{color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem'}}>Success Stories</span>
        </div>
        <div className="footer-links">
          <h4>Company</h4><span style={{color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem'}}>About Us</span><span style={{color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem'}}>Contact Support</span><span style={{color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem'}}>Privacy Policy</span>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Tutrly. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
