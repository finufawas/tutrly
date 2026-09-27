import React from 'react';
import { initials } from '../utils/tutor';

// Photo if the user has one, otherwise initials on a soft indigo tile.
function Avatar({ user, size = 52, radius = 12, className = '' }) {
  const style = { width: size, height: size, borderRadius: radius };
  if (user?.photoURL) {
    return <img src={user.photoURL} alt={user.name || ''} className={`avatar ${className}`} style={style} />;
  }
  return (
    <div className={`avatar-initials ${className}`} style={{ ...style, fontSize: Math.round(size * 0.34) }}>
      {initials(user?.name)}
    </div>
  );
}

export default Avatar;
