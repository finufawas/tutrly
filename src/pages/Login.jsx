import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
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
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
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
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        // Existing user login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if profile is complete to decide redirect
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        const data = userDoc.data();
        
        if (data && data.profileComplete) {
          navigate('/');
        } else {
          navigate('/setup-profile');
        }
      } else {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters long.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Save user profile to Firestore with profileComplete: false
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: name,
          email: email,
          role: role,
          createdAt: new Date().toISOString(),
          isVerified: role === 'parent', // Parents are verified by default, tutors need approval
          profileComplete: false,
          subjects: [],
          classLevels: [],
          bio: '',
          hourlyRate: 0
        });
        
        // New signup → go to profile setup
        navigate('/setup-profile');
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
          <p>{isLogin ? 'Sign in to access your dashboard' : 'Join Tutrly today'}</p>
        </div>
        
        {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        {message && <div className="success-message" style={{ color: '#10b981', marginBottom: '1rem', textAlign: 'center' }}>{message}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Password</label>
              {isLogin && (
                <button 
                  type="button" 
                  onClick={handleResetPassword} 
                  style={{ background: 'none', border: 'none', color: '#4F46E5', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isLogin ? "6" : "8"} />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                minLength="8" 
                style={{ 
                  borderColor: confirmPassword && password !== confirmPassword ? '#ef4444' : '',
                  borderWidth: confirmPassword && password !== confirmPassword ? '2px' : '1px'
                }}
              />
              {confirmPassword && password !== confirmPassword && (
                <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block', fontWeight: 'bold' }}>
                  <i className="ri-error-warning-line"></i> Passwords do not match
                </span>
              )}
            </div>
          )}

          {!isLogin && (
            <div className="form-group">
              <label>Account Type</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} required>
                <option value="parent">Parent / Student</option>
                <option value="tutor">Tutor</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary login-submit-btn">
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span className="toggle-link" onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}>
              {isLogin ? 'Sign up' : 'Log in'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
