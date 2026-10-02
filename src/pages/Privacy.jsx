import React from 'react';

function Privacy() {
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '800px', paddingTop: '4rem' }}>
        <h1 style={{ marginBottom: '2rem' }}>Privacy Policy</h1>
        
        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '1rem', lineHeight: '1.8' }}>
          <p><strong>Last Updated: {new Date().getFullYear()}</strong></p>
          
          <h3 style={{ marginTop: '2rem' }}>1. Information We Collect</h3>
          <p>When you register for Tutrly, we collect basic profile information such as your name, email address, location, and role (Parent or Tutor). Tutors may also provide scheduling availability, rates, and subjects taught.</p>

          <h3 style={{ marginTop: '2rem' }}>2. How We Use Your Information</h3>
          <p>We use your information to connect parents with tutors, manage bookings, and display tutor profiles publicly to users searching for educational services. Location data is used strictly for proximity matching (e.g. matching students with tutors in the same city) and for verifying class attendance via our GPS check-in feature.</p>

          <h3 style={{ marginTop: '2rem' }}>3. Data Sharing</h3>
          <p>We do not sell your personal data to third parties. Your public tutor profile (name, subjects, reviews, city) is visible to users of the platform. Private contact information is only shared between a parent and tutor once a booking is confirmed.</p>

          <h3 style={{ marginTop: '2rem' }}>4. Security</h3>
          <p>Your data is securely stored using industry-standard encryption and authentication protocols provided by Google Firebase. We do not store raw passwords.</p>
          
          <h3 style={{ marginTop: '2rem' }}>5. Contact Us</h3>
          <p>If you have any questions about this Privacy Policy, please contact us at <strong>support@tutrly.com</strong>.</p>
        </div>
      </div>
    </div>
  );
}

export default Privacy;
