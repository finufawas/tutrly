import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Here we could also save the user's name and role to Firestore database
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
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
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Account Type</label>
              <select required>
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
            <span className="toggle-link" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
              {isLogin ? 'Sign up' : 'Log in'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
