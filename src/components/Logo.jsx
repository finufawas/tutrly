import React from 'react';

// Tutrly mark 1b: roofline over an open book.
export function LogoMark({ size = 30, color = 'var(--accent)' }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M5 22 L24 7 L43 22" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 27 Q17 23.5 24 27 V42 Q17 38.5 10 42 Z" fill={color} />
      <path d="M38 27 Q31 23.5 24 27 V42 Q31 38.5 38 42 Z" fill={color} opacity=".62" />
    </svg>
  );
}

function Logo({ size = 30, label = 'Tutrly', suffix }) {
  return (
    <span className="brand">
      <LogoMark size={size} />
      <span>
        {label === 'Tutrly' ? (
          <>Tutr<span style={{ color: 'var(--accent)' }}>ly</span></>
        ) : (
          label
        )}
      </span>
      {suffix && <span className="brand-tag">{suffix}</span>}
    </span>
  );
}

export default Logo;
