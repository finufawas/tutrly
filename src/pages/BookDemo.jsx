import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';

function BookDemo() {
  const { tutorId } = useParams();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    date: '',
    timeSlot: 'Morning (9 AM - 12 PM)',
    message: ''
  });

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        const docRef = doc(db, 'users', tutorId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTutor(docSnap.data());
        } else {
          setError('Tutor not found.');
        }
      } catch (err) {
        setError('Error loading tutor details.');
      }
      setLoading(false);
    };
    fetchTutor();
  }, [tutorId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please log in to book a demo!");
      navigate('/login');
      return;
    }
    
    if (userData?.role === 'tutor') {
      alert("Tutor accounts cannot book demos.");
      return;
    }
    
    setBooking(true);
    setError('');

    try {
      await addDoc(collection(db, 'bookings'), {
        tutorId: tutorId,
        tutorName: tutor.name,
        parentId: currentUser.uid,
        parentName: userData?.name || 'Unknown Parent',
        date: formData.date,
        timeSlot: formData.timeSlot,
        message: formData.message,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      alert("Demo booked successfully! The tutor will contact you soon.");
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to book demo: ' + err.message);
      setBooking(false);
    }
  };

  if (loading) return <div style={{ padding: '8rem 5%', textAlign: 'center' }}>Loading tutor details...</div>;
  if (!tutor) return <div style={{ padding: '8rem 5%', textAlign: 'center', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)', background: '#f8fafc' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Book a Demo with {tutor.name}</h2>
        <p style={{ color: '#64748B', marginBottom: '2rem' }}>
          {tutor.subjects?.join(', ')} • {tutor.classLevels?.join(', ')}
        </p>

        {error && <div style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#fee2e2', borderRadius: '0.5rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Select Date</label>
            <input 
              type="date" 
              required
              min={new Date().toISOString().split('T')[0]} // Can't book in the past
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Preferred Time Slot</label>
            <select 
              value={formData.timeSlot}
              onChange={(e) => setFormData({...formData, timeSlot: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            >
              <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
              <option value="Afternoon (1 PM - 4 PM)">Afternoon (1 PM - 4 PM)</option>
              <option value="Evening (5 PM - 8 PM)">Evening (5 PM - 8 PM)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Message to Tutor (Optional)</label>
            <textarea 
              rows="3"
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="What specifically would you like help with?"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={booking}>
              {booking ? 'Booking...' : 'Confirm Demo'}
            </button>
            <button type="button" className="btn-outline" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default BookDemo;
