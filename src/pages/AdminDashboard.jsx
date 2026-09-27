import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tutors'); // 'tutors' or 'parents'

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      
      let results = [];
      querySnapshot.forEach((docSnap) => {
        results.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(results);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // If not admin, redirect
    if (userData && userData.role !== 'admin') {
      navigate('/dashboard');
    } else if (userData?.role === 'admin') {
      fetchUsers();
    }
  }, [userData, navigate]);

  const handleApprove = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isVerified: true });
      fetchUsers();
    } catch (err) {
      console.error("Error approving user:", err);
      alert("Failed to approve user.");
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    
    try {
      // In a real production app you'd also delete the Auth user via Cloud Function.
      // Here we just delete the Firestore doc to hide them.
      await deleteDoc(doc(db, 'users', userId));
      fetchUsers();
    } catch (err) {
      console.error("Error removing user:", err);
      alert("Failed to remove user.");
    }
  };

  if (loading) {
    return <div style={{ padding: '8rem 5%', textAlign: 'center' }}>Loading Admin Dashboard...</div>;
  }

  const tutors = users.filter(u => u.role === 'tutor');
  const parents = users.filter(u => u.role === 'parent');

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)', background: 'var(--background)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'var(--white)', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem' }}><i className="ri-shield-user-fill"></i> Admin Dashboard</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setActiveTab('tutors')} 
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: activeTab === 'tutors' ? '#3b82f6' : '#e2e8f0', color: activeTab === 'tutors' ? 'white' : 'black', border: 'none', cursor: 'pointer' }}
            >
              Manage Tutors
            </button>
            <button 
              onClick={() => setActiveTab('parents')} 
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: activeTab === 'parents' ? '#3b82f6' : '#e2e8f0', color: activeTab === 'parents' ? 'white' : 'black', border: 'none', cursor: 'pointer' }}
            >
              Manage Parents/Students
            </button>
          </div>
        </div>

        {activeTab === 'tutors' && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-dark)' }}>Tutors ({tutors.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tutors.map(tutor => (
                <div key={tutor.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <div>
                    <p style={{ fontWeight: 'bold' }}>{tutor.name || 'No Name Provided'}</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{tutor.email}</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      Status: {tutor.isVerified ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>Verified</span> : <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Pending Approval</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!tutor.isVerified && (
                      <button onClick={() => handleApprove(tutor.id)} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Approve</button>
                    )}
                    <button onClick={() => handleRemove(tutor.id)} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Remove</button>
                  </div>
                </div>
              ))}
              {tutors.length === 0 && <p>No tutors found.</p>}
            </div>
          </div>
        )}

        {activeTab === 'parents' && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-dark)' }}>Parents/Students ({parents.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {parents.map(parent => (
                <div key={parent.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <div>
                    <p style={{ fontWeight: 'bold' }}>{parent.name || 'No Name Provided'}</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{parent.email}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleRemove(parent.id)} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Remove</button>
                  </div>
                </div>
              ))}
              {parents.length === 0 && <p>No parents/students found.</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminDashboard;
