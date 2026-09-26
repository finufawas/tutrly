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
    photoURL: ''
  });
  const [imageFile, setImageFile] = useState(null);

  const availableSubjects = ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi'];
  const availableClasses = ['Class 1-5', 'Class 6-8', 'Class 9-10'];

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        bio: userData.bio || '',
        hourlyRate: userData.hourlyRate || '',
        subjects: userData.subjects || [],
        classLevels: userData.classLevels || [],
        photoURL: userData.photoURL || ''
      });
    }
  }, [userData]);

  const handleCheckboxChange = (e, field) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const currentList = prev[field];
      if (checked) {
        return { ...prev, [field]: [...currentList, value] };
      } else {
        return { ...prev, [field]: currentList.filter(item => item !== value) };
      }
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
        photoURL: formData.photoURL
      });
      // Force reload to get fresh data context or navigate to dashboard where it might trigger re-render
      // We removed window.location.reload() to prevent 404s on GitHub Pages.
      // AuthContext now uses onSnapshot to update data in real-time!
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Edit Tutor Profile</h2>
        
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Subjects Taught</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {availableSubjects.map(sub => (
                <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    value={sub}
                    checked={formData.subjects.includes(sub)}
                    onChange={(e) => handleCheckboxChange(e, 'subjects')}
                  />
                  {sub}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Class Levels</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {availableClasses.map(cls => (
                <label key={cls} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
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

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
            <button type="button" className="btn-outline" onClick={() => navigate('/dashboard')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
