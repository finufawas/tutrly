import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import heroTutorImg from '../assets/images/hero_tutor.jpg';
import './Login.css';

function Login() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.state?.isSignup ? false : true);
  const [role, setRole] = useState(location.state?.role || 'parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    if (!email) { setError('Please enter your email address first.'); return; }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
      setError('');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        const data = userDoc.data();
        navigate(data && data.profileComplete ? '/' : '/setup-profile');
      } else {
        if (password.length < 8) throw new Error('Password must be at least 8 characters long.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name, email, role,
          createdAt: new Date().toISOString(),
          isVerified: role === 'parent', // Parents are verified by default, tutors need approval
          profileComplete: false,
          subjects: [], classLevels: [], bio: '', hourlyRate: 0
        });
        navigate('/setup-profile');
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  const switchMode = (login) => { setIsLogin(login); setError(''); setMessage(''); };
  const mismatch = confirmPassword && password !== confirmPassword;

  return (
    <div className="auth-page">
      <div className="auth-art">
        <div className="copy">
          <h1 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)' }}>Find the Best Home <span className="accent">Tutors</span></h1>
          <p>A platform connecting parents with verified home tutors. Personalized education, right at your doorstep.</p>
        </div>
        <div className="photo">
          <img src={heroTutorImg} alt="Home tutoring" />
          <div className="chip-row">
            <span className="verified-badge" style={{ padding: '0.5rem 0.9rem' }}><i className="ri-shield-check-fill"></i>Verified Tutors</span>
            <span className="verified-badge" style={{ padding: '0.5rem 0.9rem' }}><i className="ri-home-heart-fill" style={{ color: 'var(--peach-ink)' }}></i>Home Tuition</span>
          </div>
        </div>
      </div>

      <div className="auth-card">
        <div className="seg">
          <button type="button" className={isLogin ? 'active' : ''} onClick={() => switchMode(true)}>Sign In</button>
          <button type="button" className={!isLogin ? 'active' : ''} onClick={() => switchMode(false)}>Sign Up</button>
        </div>
        <div>
          <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
          <p style={{ fontWeight: 600 }}>{isLogin ? 'Sign in to access your dashboard' : 'Join Tutrly today'}</p>
        </div>

        {error && <div className="alert alert-error" style={{ margin: 0 }}><i className="ri-error-warning-line"></i><p>{error}</p></div>}
        {message && <div className="alert alert-success" style={{ margin: 0 }}><i className="ri-mail-check-line"></i><p>{message}</p></div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {!isLogin && (
            <div className="role-grid">
              <button type="button" className={`role-tile ${role === 'parent' ? 'active' : ''}`} onClick={() => setRole('parent')}>
                <i className="ri-parent-line main"></i><b>Parent / Student</b><small>Find and book tutors</small><i className="ri-checkbox-circle-fill check"></i>
              </button>
              <button type="button" className={`role-tile ${role === 'tutor' ? 'active' : ''}`} onClick={() => setRole('tutor')}>
                <i className="ri-user-star-line main"></i><b>Tutor</b><small>Teach and earn</small><i className="ri-checkbox-circle-fill check"></i>
              </button>
            </div>
          )}

          {!isLogin && (
            <div><label className="field-label">Full Name</label><input className="input" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div><label className="field-label">Email Address</label><input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div>
            <div className="row-between" style={{ marginBottom: '0.4rem' }}>
              <label className="field-label" style={{ margin: 0 }}>Password</label>
              {isLogin && <button type="button" className="text-btn" onClick={handleResetPassword}>Forgot Password?</button>}
            </div>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isLogin ? '6' : '8'} />
          </div>
          {!isLogin && (
            <div>
              <label className="field-label">Confirm Password</label>
              <input className={`input ${mismatch ? 'invalid' : ''}`} type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength="8" />
              {mismatch && <span className="field-error"><i className="ri-error-warning-line"></i> Passwords do not match</span>}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-lg btn-block" style={{ marginTop: '0.4rem' }}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-foot">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" className="text-btn" style={{ fontSize: '0.9rem' }} onClick={() => switchMode(!isLogin)}>{isLogin ? 'Sign up' : 'Log in'}</button>
        </p>
      </div>
    </div>
  );
}

export default Login;
