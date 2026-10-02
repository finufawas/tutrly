import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, tutors, parents, bookings
  const [selectedUser, setSelectedUser] = useState(null); // For modal

  const fetchData = async () => {
    setLoading(true);
    try {
      const uSnap = await getDocs(query(collection(db, 'users')));
      let uRes = [];
      uSnap.forEach((d) => uRes.push({ id: d.id, ...d.data() }));
      setUsers(uRes);

      const bSnap = await getDocs(query(collection(db, 'bookings')));
      let bRes = [];
      bSnap.forEach((d) => bRes.push({ id: d.id, ...d.data() }));
      setBookings(bRes);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      navigate('/dashboard');
    } else if (userData?.role === 'admin') {
      fetchData();
    }
  }, [userData, navigate]);

  const handleApprove = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isVerified: true, isSuspended: false });
      fetchData();
      setSelectedUser(null);
    } catch (err) {
      alert("Failed to approve user.");
    }
  };

  const handleSuspend = async (userId, suspend) => {
    if (!window.confirm(`Are you sure you want to ${suspend ? 'suspend' : 'unsuspend'} this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { isSuspended: suspend });
      fetchData();
      if (selectedUser && selectedUser.id === userId) setSelectedUser(null);
    } catch (err) {
      alert("Failed to update user.");
    }
  };

  const handleToggleAdmin = async (userId, isAdmin) => {
    if (!window.confirm(`Are you sure you want to ${isAdmin ? 'promote' : 'demote'} this user to Admin?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: isAdmin ? 'admin' : 'parent' });
      fetchData();
      if (selectedUser && selectedUser.id === userId) setSelectedUser(null);
    } catch (err) {
      alert("Failed to change user role.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      fetchData();
      setSelectedUser(null);
    } catch (err) {
      alert("Failed to remove user.");
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white' }}>Loading Admin Panel...</div>;
  }

  const tutors = users.filter(u => u.role === 'tutor');
  const parents = users.filter(u => u.role === 'parent');
  const admins = users.filter(u => u.role === 'admin');
  const pendingTutors = tutors.filter(t => !t.isVerified && !t.isSuspended);

  // Calculate total tracked hours
  let totalHours = 0;
  bookings.filter(b => b.status === 'completed').forEach(b => {
    if (b.actualStartTime && b.actualEndTime) {
      const ms = new Date(b.actualEndTime) - new Date(b.actualStartTime);
      totalHours += ms / 3600000;
    }
  });

  const getStatusPill = (tutor) => {
    if (tutor.isSuspended) return <span style={pillStyle('#ef4444')}>Suspended</span>;
    if (tutor.isVerified) return <span style={pillStyle('#10b981')}>Active</span>;
    return <span style={pillStyle('#f59e0b')}>Pending</span>;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', background: '#0f172a', color: 'white', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '2.5rem', paddingLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="ri-shield-check-fill" style={{ color: '#3b82f6' }}></i> Control Panel
        </h2>
        
        <button onClick={() => setActiveTab('overview')} style={sidebarBtn(activeTab === 'overview')}>
          <i className="ri-dashboard-line"></i> Overview
        </button>
        <button onClick={() => setActiveTab('tutors')} style={sidebarBtn(activeTab === 'tutors')}>
          <i className="ri-presentation-line"></i> Tutors ({tutors.length})
        </button>
        <button onClick={() => setActiveTab('parents')} style={sidebarBtn(activeTab === 'parents')}>
          <i className="ri-parent-line"></i> Students & Parents ({parents.length})
        </button>
        <button onClick={() => setActiveTab('admins')} style={sidebarBtn(activeTab === 'admins')}>
          <i className="ri-shield-user-line"></i> Admins ({admins.length})
        </button>
        <button onClick={() => setActiveTab('bookings')} style={sidebarBtn(activeTab === 'bookings')}>
          <i className="ri-calendar-event-line"></i> Bookings ({bookings.length})
        </button>
        
        <div style={{ flex: 1 }}></div>
        <button onClick={handleSignOut} style={{ ...sidebarBtn(false), color: '#ef4444', marginTop: 'auto' }}>
          <i className="ri-logout-box-r-line"></i> Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
        
        {activeTab === 'overview' && (
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#0f172a', fontWeight: 800 }}>Platform Overview</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              <div style={metricCard('#3b82f6')}>
                <h3 style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Tutors</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>{tutors.filter(t => t.isVerified && !t.isSuspended).length}</p>
              </div>
              <div style={metricCard('#f59e0b')}>
                <h3 style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pending Approvals</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>{pendingTutors.length}</p>
              </div>
              <div style={metricCard('#10b981')}>
                <h3 style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Students</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>{parents.length}</p>
              </div>
              <div style={metricCard('#8b5cf6')}>
                <h3 style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tracked Hours</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>{totalHours.toFixed(1)}<span style={{ fontSize: '1.5rem', color: '#94a3b8' }}>h</span></p>
              </div>
            </div>

            {pendingTutors.length > 0 && (
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginBottom: '1.2rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><i className="ri-alert-fill"></i> Action Required: Pending Tutors</h3>
                {pendingTutors.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '1.1rem', color: '#0f172a' }}>{t.name}</p>
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{t.email}</p>
                    </div>
                    <button onClick={() => setSelectedUser(t)} style={{ padding: '0.6rem 1.2rem', background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Review Profile</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tutors' && (
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#0f172a', fontWeight: 800 }}>Manage Tutors</h1>
            <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tutors.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}><b>{t.name}</b></td>
                      <td style={tdStyle}>{t.email}</td>
                      <td style={tdStyle}>{getStatusPill(t)}</td>
                      <td style={tdStyle}>
                        <button onClick={() => setSelectedUser(t)} style={actionBtn('#3b82f6')}>View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'parents' && (
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#0f172a', fontWeight: 800 }}>Manage Parents & Students</h1>
            <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Parent Name</th>
                    <th style={thStyle}>Student Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parents.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}><b>{p.name}</b></td>
                      <td style={tdStyle}>{p.studentName || '—'}</td>
                      <td style={tdStyle}>{p.email}</td>
                      <td style={tdStyle}>
                        <button onClick={() => setSelectedUser(p)} style={actionBtn('#3b82f6')}>View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#0f172a', fontWeight: 800 }}>Manage Admins</h1>
            <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Admin Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}><b>{a.name || 'Admin'}</b></td>
                      <td style={tdStyle}>{a.email}</td>
                      <td style={tdStyle}>
                        <button onClick={() => setSelectedUser(a)} style={actionBtn('#3b82f6')}>View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#0f172a', fontWeight: 800 }}>Platform Bookings</h1>
            <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Tutor</th>
                    <th style={thStyle}>Parent</th>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.sort((a,b) => new Date(b.date) - new Date(a.date)).map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}><b>{b.date}</b></td>
                      <td style={tdStyle}>{b.tutorName}</td>
                      <td style={tdStyle}>{b.parentName}</td>
                      <td style={tdStyle}>{b.startTime} - {b.endTime}</td>
                      <td style={tdStyle}>
                        <span style={pillStyle(b.status === 'completed' ? '#10b981' : b.status === 'cancelled' ? '#ef4444' : b.status === 'confirmed' ? '#3b82f6' : '#f59e0b')}>
                          {b.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No bookings found on the platform yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1.25rem', width: '550px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>User Profile</h2>
              <button onClick={() => setSelectedUser(null)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}><i className="ri-close-line"></i></button>
            </div>
            
            <div style={{ marginBottom: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><p style={labelStyle}>Full Name</p><p style={valueStyle}>{selectedUser.name}</p></div>
                <div><p style={labelStyle}>Account Role</p><p style={{...valueStyle, textTransform: 'capitalize'}}>{selectedUser.role}</p></div>
                <div><p style={labelStyle}>Email Address</p><p style={valueStyle}>{selectedUser.email}</p></div>
                <div><p style={labelStyle}>Phone Number</p><p style={valueStyle}>{selectedUser.phone || '—'}</p></div>
                <div style={{ gridColumn: 'span 2' }}><p style={labelStyle}>Location / City</p><p style={valueStyle}>{selectedUser.city || '—'}</p></div>
              </div>
            </div>

            {selectedUser.role === 'tutor' && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Tutor Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div><p style={labelStyle}>Hourly Rate</p><p style={valueStyle}>₹{selectedUser.hourlyRate || 0}</p></div>
                  <div><p style={labelStyle}>Current Status</p><p style={{ marginTop: '0.2rem' }}>{getStatusPill(selectedUser)}</p></div>
                  <div style={{ gridColumn: 'span 2' }}><p style={labelStyle}>Subjects</p><p style={valueStyle}>{selectedUser.subjects?.join(', ') || '—'}</p></div>
                  <div style={{ gridColumn: 'span 2' }}><p style={labelStyle}>Boards & Classes</p><p style={valueStyle}>{selectedUser.boards?.join(', ') || '—'} | {selectedUser.classLevels?.join(', ') || '—'}</p></div>
                  <div style={{ gridColumn: 'span 2' }}><p style={labelStyle}>Bio</p><p style={{ ...valueStyle, background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>"{selectedUser.bio || '—'}"</p></div>
                </div>
              </div>
            )}

            {selectedUser.role === 'parent' && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Student Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><p style={labelStyle}>Student Name</p><p style={valueStyle}>{selectedUser.studentName || '—'}</p></div>
                  <div><p style={labelStyle}>Class Level</p><p style={valueStyle}>{selectedUser.studentClass || '—'}</p></div>
                  <div style={{ gridColumn: 'span 2' }}><p style={labelStyle}>Board</p><p style={valueStyle}>{selectedUser.studentBoard?.join(', ') || '—'}</p></div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              {selectedUser.role === 'tutor' && !selectedUser.isVerified && !selectedUser.isSuspended && (
                <button onClick={() => handleApprove(selectedUser.id)} style={{ flex: 1, padding: '0.8rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}><i className="ri-check-line"></i> Approve Tutor</button>
              )}
              {selectedUser.role !== 'admin' && (
                <>
                  <button onClick={() => handleToggleAdmin(selectedUser.id, true)} style={{ flex: 1, padding: '0.8rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
                    <i className="ri-shield-star-line"></i> Promote to Admin
                  </button>
                  <button onClick={() => handleSuspend(selectedUser.id, !selectedUser.isSuspended)} style={{ flex: 1, padding: '0.8rem', background: selectedUser.isSuspended ? '#3b82f6' : '#f59e0b', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
                    {selectedUser.isSuspended ? <><i className="ri-play-circle-line"></i> Reactivate</> : <><i className="ri-pause-circle-line"></i> Suspend</>}
                  </button>
                </>
              )}
              {selectedUser.role === 'admin' && userData?.email !== selectedUser.email && (
                <button onClick={() => handleToggleAdmin(selectedUser.id, false)} style={{ flex: 1, padding: '0.8rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
                  <i className="ri-user-down-line"></i> Demote Admin
                </button>
              )}
              <button onClick={() => handleRemove(selectedUser.id)} style={{ padding: '0.8rem 1.2rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }} title="Delete Permanently"><i className="ri-delete-bin-line"></i></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline styles for Admin Panel isolation
const sidebarBtn = (active) => ({
  display: 'block', width: '100%', textAlign: 'left', padding: '0.85rem 1.2rem',
  background: active ? '#1e293b' : 'transparent', color: active ? '#38bdf8' : '#94a3b8',
  border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem'
});

const metricCard = (color) => ({
  background: 'white', padding: '1.5rem', borderRadius: '1rem',
  borderLeft: `5px solid ${color}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
});

const thStyle = { padding: '1.25rem 1rem', color: '#64748b', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '1.25rem 1rem', color: '#334155', fontSize: '0.95rem' };
const labelStyle = { fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' };
const valueStyle = { fontSize: '1rem', color: '#0f172a', fontWeight: 500 };

const pillStyle = (color) => ({
  background: `${color}15`, color: color, padding: '0.35rem 0.85rem',
  borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
});

const actionBtn = (color) => ({
  background: 'transparent', color: color, border: `1px solid ${color}40`,
  padding: '0.4rem 0.85rem', borderRadius: '0.35rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
  transition: 'all 0.2s'
});

export default AdminDashboard;
