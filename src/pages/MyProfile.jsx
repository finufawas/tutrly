import React from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import tutorPlaceholder from '../assets/images/tutor_1.jpg';

function MyProfile() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid));
        await deleteUser(currentUser);
        navigate('/');
      } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
          alert("Please log out and log back in to verify your identity before deleting your account.");
        } else {
          alert("Failed to delete account: " + error.message);
        }
      }
    }
  };

  if (!userData) return <div style={{ padding: '8rem 5%', textAlign: 'center' }}>Loading...</div>;

  const isTutor = userData.role === 'tutor';

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ background: 'var(--white)', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem' }}>My Profile</h2>
          <Link to="/edit-profile" className="btn-secondary">
            Edit Profile
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {isTutor && (
            <img 
              src={userData.photoURL || tutorPlaceholder} 
              alt="Profile" 
              style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f1f5f9' }}
            />
          )}
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{userData.name}</h3>
            <p style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }}>{userData.email}</p>
            <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', textTransform: 'capitalize' }}>
              {userData.role} Account
            </span>
          </div>
        </div>

        {isTutor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Hourly Rate</h4>
              <p>₹{userData.hourlyRate || 0} / hr</p>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Bio</h4>
              <p style={{ color: 'var(--text-dark)', whiteSpace: 'pre-wrap' }}>{userData.bio || 'No bio added yet.'}</p>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Subjects</h4>
              <p>{userData.subjects?.length > 0 ? userData.subjects.join(', ') : 'None listed'}</p>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Class Levels</h4>
              <p>{userData.classLevels?.length > 0 ? userData.classLevels.join(', ') : 'None listed'}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={handleLogout} className="btn-outline">
            Sign Out
          </button>
          <button onClick={handleDeleteAccount} className="btn-outline" style={{ borderColor: 'red', color: 'red' }}>
            Delete Account
          </button>
        </div>

      </div>
    </div>
  );
}

export default MyProfile;
