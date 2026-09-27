import React from 'react';
import { Link } from 'react-router-dom';
import Avatar, { tintOf } from './Avatar';
import { classRange } from '../utils/tutor';

// Pastel tutor card used on Home and Search. `locked` = guest view.
function TutorCard({ tutor, locked = false }) {
  const profileTo = locked ? '/login' : `/tutor/${tutor.id}`;
  const bookTo = locked ? '/login' : `/book/${tutor.id}`;
  return (
    <div className={`tutor-card ${tintOf(tutor.name)}`}>
      <Link to={profileTo} className="tutor-photo">
        <Avatar user={tutor} size={200} radius={0} tint={false} />
        <span className="verified-badge"><i className="ri-shield-check-fill"></i>Verified</span>
      </Link>
      <div className="stack-col">
        <Link to={profileTo} className="tutor-body">
          <div className="name-row">
            <span className="name">{tutor.name}</span>
            <span className="rating">★ {tutor.rating ? Number(tutor.rating).toFixed(1) : 'New'}</span>
          </div>
          <span className="sub">{tutor.subjects?.join(', ') || 'No subjects listed'} · {classRange(tutor.classLevels)}</span>
        </Link>
        <div className="price-bar">
          <span className="price">{locked ? '—' : `₹${tutor.hourlyRate || 0}`}<small>{locked ? ' sign in' : '/hr'}</small></span>
          <Link to={bookTo} className="btn btn-sm">{locked ? 'Sign in' : 'Book'}</Link>
        </div>
      </div>
    </div>
  );
}

export default TutorCard;
