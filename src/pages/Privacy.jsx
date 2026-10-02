import React from 'react';

// Full policy text (unchanged wording)
const SECTIONS = [
  ['collect', 'Information We Collect', 'When you register for Tutrly, we collect basic profile information such as your name, email address, location, and role (Parent or Tutor). Tutors may also provide scheduling availability, rates, and subjects taught.'],
  ['use', 'How We Use Your Information', 'We use your information to connect parents with tutors, manage bookings, and display tutor profiles publicly to users searching for educational services. Location data is used strictly for proximity matching (e.g. matching students with tutors in the same city) and for verifying class attendance via our GPS check-in feature.'],
  ['sharing', 'Data Sharing', 'We do not sell your personal data to third parties. Your public tutor profile (name, subjects, reviews, city) is visible to users of the platform. Private contact information is only shared between a parent and tutor once a booking is confirmed.'],
  ['security', 'Security', 'Your data is securely stored using industry-standard encryption and authentication protocols provided by Google Firebase. We do not store raw passwords.'],
  ['contact', 'Contact Us', null]
];

// Plain-language summary shown first
const SUMMARY = [
  ['tile-lilac', 'ri-folder-user-line', 'var(--lilac-ink)', 'We collect', 'Name, email, city and role. Tutors add subjects, rates and availability.'],
  ['tile-peach', 'ri-forbid-2-line', 'var(--danger)', 'We never', 'Sell your data, store raw passwords, or share contact details before a booking is confirmed.'],
  ['tile-mint', 'ri-map-pin-user-line', 'var(--success)', 'GPS is only for', 'Matching you with nearby tutors and checking the tutor is at your home when class starts.']
];
const TINTS = ['tint-0', 'tint-2', 'tint-1', 'tint-3', 'tint-4'];

function Privacy() {
  return (
    <div className="page">
      <div className="pv-wrap">
        <div>
          <p className="eyebrow">LAST UPDATED · {new Date().getFullYear()}</p>
          <h1 className="pv-title">Privacy Policy</h1>
        </div>

        <p className="pv-lead">The short version, before the details:</p>
        <div className="pv-summary">
          {SUMMARY.map(([tile, icon, color, title, text]) => (
            <div key={title} className={`pv-tile ${tile}`}>
              <span className="pv-ic" style={{ color }}><i className={icon}></i></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>

        <article className="pv-full">
          <p className="eyebrow">FULL POLICY</p>
          {SECTIONS.map(([id, title, body], i) => (
            <section key={id} id={id} className="pv-sec">
              <span className={`pv-num ${TINTS[i % 5]}`}>{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{body || <>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@tutrly.com" className="link">support@tutrly.com</a>.</>}</p>
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

export default Privacy;
