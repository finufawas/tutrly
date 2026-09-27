import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import tutorPlaceholder from '../assets/images/tutor_1.jpg'; 

function TutorProfile() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        const docRef = doc(db, 'users', tutorId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().role === 'tutor') {
          setTutor({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Tutor not found.');
        }
      } catch (err) {
        setError('Error loading tutor profile.');
      }
      setLoading(false);
    };
    fetchTutor();
  }, [tutorId]);

  if (loading) return <div style={{ padding: '8rem 5%', textAlign: 'center' }}>Loading profile...</div>;
  if (!tutor) return <div style={{ padding: '8rem 5%', textAlign: 'center', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)', background: '#f8fafc' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <img 
            src={tutor.photoURL || tutorPlaceholder} 
            alt={tutor.name} 
            style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f1f5f9' }}
          />
          <div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{tutor.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#64748B', marginBottom: '1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><i className="ri-star-fill" style={{color: '#f59e0b'}}></i> New Tutor</span>
              <span>•</span>
              <span style={{ fontWeight: 'bold', color: '#0f172a' }}>₹{tutor.hourlyRate || 0} / hr</span>
            </div>
            
            {userData?.role === 'tutor' ? (
              <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>
                <i className="ri-error-warning-line"></i> Tutors cannot book demos with other tutors.
              </p>
            ) : (
              <Link to={`/book/${tutor.id}`} className="btn-primary" style={{ display: 'inline-block' }}>Book a Demo</Link>
            )}
            
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>About Me</h3>
            <p style={{ lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
              {tutor.bio || 'This tutor has not added a bio yet.'}
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Boards Taught</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {tutor.boards?.map(b => (
                <span key={b} style={{ background: '#fef3c7', color: '#d97706', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{b}</span>
              ))}
              {(!tutor.boards || tutor.boards.length === 0) && <span style={{ color: '#64748B' }}>None listed</span>}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Subjects</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {tutor.subjects?.map(sub => (
                <span key={sub} style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.9rem' }}>{sub}</span>
              ))}
              {(!tutor.subjects || tutor.subjects.length === 0) && <span style={{ color: '#64748B' }}>None listed</span>}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Class Levels</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {tutor.classLevels?.map(cls => (
                <span key={cls} style={{ background: '#f1f5f9', color: '#475569', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.9rem' }}>{cls}</span>
              ))}
              {(!tutor.classLevels || tutor.classLevels.length === 0) && <span style={{ color: '#64748B' }}>None listed</span>}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Availability</h3>
            {(!tutor.availability || Object.keys(tutor.availability).length === 0) ? (
              <span style={{ color: '#64748B' }}>No availability set</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const slots = tutor.availability[day];
                  if (!slots || slots.length === 0) return null;
                  return (
                    <div key={day} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <span style={{ width: '100px', fontWeight: 'bold', color: '#334155' }}>{day}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {slots.map((slot, idx) => (
                          <span key={idx} style={{ background: '#f0fdf4', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.85rem', border: '1px solid #bbf7d0' }}>
                            {slot.start} - {slot.end}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default TutorProfile;
