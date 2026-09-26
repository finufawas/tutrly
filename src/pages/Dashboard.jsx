import React from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Dashboard</h2>
        <p style={{ marginBottom: '2rem', color: '#64748B' }}>
          Welcome back! You are logged in as <strong>{currentUser?.email}</strong>.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}><i className="ri-calendar-check-line"></i> Upcoming Classes</h3>
            <p>You have no classes scheduled for today.</p>
          </div>
          <div style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}><i className="ri-user-settings-line"></i> Profile Settings</h3>
            <p>Complete your profile to increase your visibility.</p>
          </div>
        </div>

        <button onClick={handleLogout} className="btn-outline">
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
