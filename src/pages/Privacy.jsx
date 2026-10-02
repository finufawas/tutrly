import React from 'react';

const SECTIONS = [
  ['collect', '1. Information We Collect', 'When you register for Tutrly, we collect basic profile information such as your name, email address, location, and role (Parent or Tutor). Tutors may also provide scheduling availability, rates, and subjects taught.'],
  ['use', '2. How We Use Your Information', 'We use your information to connect parents with tutors, manage bookings, and display tutor profiles publicly to users searching for educational services. Location data is used strictly for proximity matching (e.g. matching students with tutors in the same city) and for verifying class attendance via our GPS check-in feature.'],
  ['sharing', '3. Data Sharing', 'We do not sell your personal data to third parties. Your public tutor profile (name, subjects, reviews, city) is visible to users of the platform. Private contact information is only shared between a parent and tutor once a booking is confirmed.'],
  ['security', '4. Security', 'Your data is securely stored using industry-standard encryption and authentication protocols provided by Google Firebase. We do not store raw passwords.'],
  ['contact', '5. Contact Us', null]
];

function Privacy() {
  return (
    <div className="page">
      <div className="legal">
        <nav className="legal-toc">
          <p className="eyebrow" style={{ color: 'var(--lilac-ink)', marginBottom: 6 }}>ON THIS PAGE</p>
          {SECTIONS.map(([id, title]) => <a key={id} href={`#${id}`}>{title}</a>)}
        </nav>
        <article className="legal-body">
          <div>
            <p className="eyebrow">LAST UPDATED · {new Date().getFullYear()}</p>
            <h1 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)', marginTop: 6 }}>Privacy Policy</h1>
          </div>
          {SECTIONS.map(([id, title, body]) => (
            <section key={id} id={id}>
              <h3>{title}</h3>
              <p>{body || <>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@tutrly.com" className="link">support@tutrly.com</a>.</>}</p>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

export default Privacy;
