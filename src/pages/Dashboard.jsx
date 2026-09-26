import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

function Dashboard() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const isTutor = userData?.role === 'tutor';
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchBookings = async () => {
    if (!currentUser || !userData) return;
    setLoadingBookings(true);
    try {
      const field = isTutor ? 'tutorId' : 'parentId';
      const q = query(collection(db, 'bookings'), where(field, '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      let results = [];
      querySnapshot.forEach((docSnap) => {
        results.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // Sort by date (closest first)
      results.sort((a, b) => new Date(a.date) - new Date(b.date));
      setBookings(results);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
    setLoadingBookings(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [currentUser, userData, isTutor]);

  const handleAccept = async (bookingId) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, { status: 'confirmed' });
      fetchBookings();
    } catch (err) {
      console.error("Error accepting booking:", err);
      alert("Failed to accept booking.");
    }
  };

  const handleCancelSubmit = async (bookingId) => {
    const words = cancelReason.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 10) {
      alert("Please provide a reason with at least 10 words.");
      return;
    }

    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, { 
        status: 'cancelled',
        cancelReason: cancelReason.trim() 
      });
      setCancelBookingId(null);
      setCancelReason('');
      fetchBookings();
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert("Failed to cancel booking.");
    }
  };

  const getStatusColor = (status) => {
    if (status === 'confirmed') return '#10b981';
    if (status === 'cancelled') return '#ef4444';
    return '#f59e0b'; // pending
  };

  const renderBookingCard = (b, title) => {
    const isCancelling = cancelBookingId === b.id;
    const words = cancelReason.trim().split(/\s+/).filter(w => w.length > 0);
    const isValidCancel = words.length >= 10;

    return (
      <div key={b.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', borderLeft: `4px solid ${getStatusColor(b.status)}`, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontWeight: 'bold' }}>{title}</p>
            <p style={{ fontSize: '0.9rem', color: '#64748B' }}>{b.date} • {b.startTime} - {b.endTime}</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 'bold', color: getStatusColor(b.status) }}>
              Status: {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
            </p>
            {b.message && <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', fontStyle: 'italic' }}>"{b.message}"</p>}
            {b.status === 'cancelled' && b.cancelReason && (
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#ef4444' }}>Reason: {b.cancelReason}</p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
            {isTutor && b.status === 'pending' && (
              <button onClick={() => handleAccept(b.id)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Accept</button>
            )}
            
            {(b.status === 'pending' || b.status === 'confirmed') && !isCancelling && (
              <button onClick={() => setCancelBookingId(b.id)} className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#ef4444', borderColor: '#ef4444' }}>Cancel</button>
            )}
          </div>
        </div>

        {isCancelling && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#991b1b' }}>Provide a reason for cancellation (Min 10 words):</p>
            <textarea 
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows="2" 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #f87171', marginBottom: '0.5rem' }}
            ></textarea>
            <p style={{ fontSize: '0.8rem', color: isValidCancel ? '#15803d' : '#991b1b', marginBottom: '0.5rem' }}>Word count: {words.length}/10</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleCancelSubmit(b.id)} disabled={!isValidCancel} style={{ padding: '0.25rem 0.75rem', background: isValidCancel ? '#ef4444' : '#fca5a5', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: isValidCancel ? 'pointer' : 'not-allowed' }}>Confirm Cancel</button>
              <button onClick={() => { setCancelBookingId(null); setCancelReason(''); }} style={{ padding: '0.25rem 0.75rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '0.25rem', cursor: 'pointer' }}>Back</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          {isTutor ? 'Tutor Dashboard' : 'Parent Dashboard'}
        </h2>
        <p style={{ marginBottom: '2rem', color: '#64748B' }}>
          Welcome back, <strong>{userData?.name || currentUser?.email}</strong>!
        </p>
        
        {isTutor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}><i className="ri-calendar-check-line"></i> Class Requests & Schedule</h3>
              {loadingBookings ? (
                <p>Loading classes...</p>
              ) : bookings.length === 0 ? (
                <p>You have no classes scheduled.</p>
              ) : (
                <div>
                  {bookings.map(b => renderBookingCard(b, b.parentName))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}><i className="ri-search-eye-line"></i> Find a Tutor</h3>
              <p style={{ marginBottom: '1rem' }}>Search for expert educators matching your child's needs.</p>
              <Link to="/#find-tutor" className="btn-secondary" style={{ display: 'inline-block' }}>Search Tutors</Link>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}><i className="ri-calendar-check-line"></i> Booked Demos</h3>
              {loadingBookings ? (
                <p>Loading bookings...</p>
              ) : bookings.length === 0 ? (
                <p>You have not booked any demo classes yet.</p>
              ) : (
                <div>
                  {bookings.map(b => renderBookingCard(b, `Tutor: ${b.tutorName}`))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;
