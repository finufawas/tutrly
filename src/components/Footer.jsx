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
          <h4>For Parents</h4><a href="#">Find a Tutor</a><a href="#">Request a Tutor</a><a href="#">Pricing</a>
        </div>
        <div className="footer-links">
          <h4>For Tutors</h4><a href="#">Join as Tutor</a><a href="#">Tutor Guidelines</a><a href="#">Success Stories</a>
        </div>
        <div className="footer-links">
          <h4>Company</h4><a href="#">About Us</a><a href="#">Contact Support</a><a href="#">Privacy Policy</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2024 Tutrly. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
