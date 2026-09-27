import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function EditProfile() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    hourlyRate: '',
    subjects: [],
    classLevels: [],
    photoURL: '',
    availability: {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    }
  });
  const [subjectInput, setSubjectInput] = useState('');
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const [newSlot, setNewSlot] = useState({ day: 'Monday', start: '', end: '' });

  const availableClasses = [...Array(12)].map((_, i) => `Class ${i+1}`);
  const availableBoards = ['State', 'CBSE', 'ICSE'];

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        bio: userData.bio || '',
        hourlyRate: userData.hourlyRate || '',
        subjects: userData.subjects || [],
        classLevels: userData.classLevels || [],
        boards: userData.boards || [],
        photoURL: userData.photoURL || '',
        availability: userData.availability || {
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
        }
      });
    }
  }, [userData]);

  const handleCheckboxChange = (e, field) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const currentList = prev[field] || [];
      if (checked) {
        return { ...prev, [field]: [...currentList, value] };
      } else {
        return { ...prev, [field]: currentList.filter(item => item !== value) };
      }
    });
  };

  const handleAddSubject = (e) => {
    e.preventDefault();
    if (subjectInput.trim() && !formData.subjects.includes(subjectInput.trim())) {
      setFormData(prev => ({ ...prev, subjects: [...prev.subjects, subjectInput.trim()] }));
      setSubjectInput('');
    }
  };

  const removeSubject = (sub) => {
    setFormData(prev => ({ ...prev, subjects: prev.subjects.filter(s => s !== sub) }));
  };

  const handleAddSlot = () => {
    if (!newSlot.start || !newSlot.end) {
      alert("Please select both start and end times.");
      return;
    }
    if (newSlot.start >= newSlot.end) {
      alert("End time must be after start time.");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [newSlot.day]: [...(prev.availability[newSlot.day] || []), { start: newSlot.start, end: newSlot.end }]
      }
    }));
    setNewSlot({ ...newSlot, start: '', end: '' });
  };

  const handleRemoveSlot = (day, index) => {
    setFormData(prev => {
      const newDaySlots = [...prev.availability[day]];
      newDaySlots.splice(index, 1);
      return {
        ...prev,
        availability: { ...prev.availability, [day]: newDaySlots }
      };
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to Base64 string (JPEG, 70% quality)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({ ...prev, photoURL: dataUrl }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        name: formData.name,
        bio: formData.bio,
        hourlyRate: Number(formData.hourlyRate),
        subjects: formData.subjects,
        classLevels: formData.classLevels,
        boards: formData.boards,
        photoURL: formData.photoURL,
        availability: formData.availability
      });
      // Force reload to get fresh data context or navigate to dashboard where it might trigger re-render
      // We removed window.location.reload() to prevent 404s on GitHub Pages.
      // AuthContext now uses onSnapshot to update data in real-time!
      navigate('/profile');
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>{userData?.role === 'tutor' ? 'Edit Tutor Profile' : 'Edit Profile'}</h2>
        
        {error && <div style={{ color: 'red', marginBottom: '1rem', padding: '1rem', background: '#fee2e2', borderRadius: '0.5rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Profile Picture</label>
            {formData.photoURL && <img src={formData.photoURL} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem' }} />}
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Full Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
          </div>

          {userData?.role === 'tutor' && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Hourly Rate (₹)</label>
                <input 
                  type="number" 
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
                  required
                  min="0"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Professional Bio</label>
                <textarea 
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  rows="4"
                  placeholder="Tell parents about your experience and teaching style..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                ></textarea>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Boards</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                  {availableBoards.map(board => (
                    <label key={board} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        value={board}
                        checked={formData.boards?.includes(board) || false}
                        onChange={(e) => handleCheckboxChange(e, 'boards')}
                      />
                      {board}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Subjects Taught</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {formData.subjects.map(sub => (
                    <span key={sub} style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {sub} <i className="ri-close-line" style={{cursor: 'pointer'}} onClick={() => removeSubject(sub)}></i>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    placeholder="e.g. Mathematics"
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubject(e); } }}
                  />
                  <button type="button" onClick={handleAddSubject} className="btn-secondary">Add</button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Class Levels</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                  {availableClasses.map(cls => (
                    <label key={cls} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        value={cls}
                        checked={formData.classLevels.includes(cls)}
                        onChange={(e) => handleCheckboxChange(e, 'classLevels')}
                      />
                      {cls}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.2rem' }}>Availability Schedule</label>
                <p style={{ color: '#64748B', marginBottom: '1rem', fontSize: '0.9rem' }}>Add the time slots you are available to take classes each day. Parents will pick from these slots.</p>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1', minWidth: '120px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>Day</label>
                    <select value={newSlot.day} onChange={(e) => setNewSlot({...newSlot, day: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }}>
                      {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '1', minWidth: '120px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>Start Time</label>
                    <input type="time" value={newSlot.start} onChange={(e) => setNewSlot({...newSlot, start: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ flex: '1', minWidth: '120px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>End Time</label>
                    <input type="time" value={newSlot.end} onChange={(e) => setNewSlot({...newSlot, end: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                  </div>
                  <button type="button" onClick={handleAddSlot} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Add Slot</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {daysOfWeek.map(day => {
                    const slots = formData.availability[day] || [];
                    if (slots.length === 0) return null;
                    return (
                      <div key={day} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                        <div style={{ width: '100px', fontWeight: 'bold', color: '#334155' }}>{day}</div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
                          {slots.map((slot, idx) => (
                            <span key={idx} style={{ background: '#f0fdf4', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #bbf7d0' }}>
                              {slot.start} - {slot.end}
                              <i className="ri-close-circle-fill" style={{cursor: 'pointer', color: '#dc2626'}} onClick={() => handleRemoveSlot(day, idx)}></i>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
            <button type="button" className="btn-outline" onClick={() => navigate('/profile')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
