import React from 'react';
import { initials } from '../utils/tutor';

// Stable pastel tint per name: tint-0 … tint-4 (see App.css)
export const tintOf = (name = '') => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `tint-${h % 5}`;
};

// Photo if the user has one, otherwise initials on a pastel tile.
function Avatar({ user, size = 52, radius = 16, className = '', tint = true }) {
  const style = { width: size, height: size, borderRadius: radius };
  if (user?.photoURL) {
    return <img src={user.photoURL} alt={user.name || ''} className={`avatar ${className}`} style={style} />;
  }
  return (
    <div className={`avatar-initials ${tint ? tintOf(user?.name) : ''} ${className}`} style={{ ...style, fontSize: Math.round(size * 0.34) }}>
      {initials(user?.name)}
    </div>
  );
}

export default Avatar;
