import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

function SetupProfile() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isTutor = userData?.role === 'tutor';

  // Parent/Student fields
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentBoard, setStudentBoard] = useState([]);
  const [phone, setPhone] = useState('');

  // Tutor fields
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [boards, setBoards] = useState([]);
  const [availability, setAvailability] = useState({});

  const allSubjects = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physics', 'Chemistry', 'Biology'];
  const allBoards = ['State', 'CBSE', 'ICSE'];
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleItem = (arr, setArr, item) => {
    if (arr.includes(item)) {
      setArr(arr.filter(i => i !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  const addSlot = (day) => {
    const current = availability[day] || [];
    setAvailability({ ...availability, [day]: [...current, { start: '09:00', end: '10:00' }] });
  };

  const updateSlot = (day, idx, field, value) => {
    const updated = [...(availability[day] || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setAvailability({ ...availability, [day]: updated });
  };

  const removeSlot = (day, idx) => {
    const updated = [...(availability[day] || [])];
    updated.splice(idx, 1);
    setAvailability({ ...availability, [day]: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userRef = doc(db, 'users', currentUser.uid);

      if (isTutor) {
        if (subjects.length === 0) throw new Error('Please select at least one subject.');
        if (classLevels.length === 0) throw new Error('Please select at least one class level.');
        if (boards.length === 0) throw new Error('Please select at least one board.');
        if (!hourlyRate || Number(hourlyRate) <= 0) throw new Error('Please enter a valid hourly rate.');
        if (!bio.trim()) throw new Error('Please write a short bio.');

        await updateDoc(userRef, {
          subjects,
          classLevels,
          boards,
          hourlyRate: Number(hourlyRate),
          bio: bio.trim(),
          availability,
          profileComplete: true
        });
      } else {
        if (!studentName.trim()) throw new Error('Please enter the student\'s name.');
        if (!studentClass) throw new Error('Please select the class level.');
        if (studentBoard.length === 0) throw new Error('Please select at least one board.');

        await updateDoc(userRef, {
          studentName: studentName.trim(),
          studentClass,
          studentBoard,
          phone: phone.trim(),
          profileComplete: true
        });
      }

      navigate('/');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (!userData) return <div style={{ padding: '8rem 5%', textAlign: 'center' }}>Loading...</div>;

  // If profile is already complete, redirect to home
  if (userData.profileComplete) {
    navigate('/');
    return null;
  }

  const chipStyle = (selected) => ({
    padding: '0.5rem 1rem',
    borderRadius: '2rem',
    border: selected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
    background: selected ? 'var(--primary)' : 'var(--white)',
    color: selected ? 'white' : 'var(--text-dark)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: selected ? 'bold' : 'normal',
    transition: 'all 0.2s ease'
  });

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
    fontSize: '1rem',
    background: 'var(--white)',
    color: 'var(--text-dark)'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    color: 'var(--text-dark)'
  };

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)', background: 'var(--background)' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', background: 'var(--white)', padding: '3rem', borderRadius: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '60px', height: '60px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem', color: 'white' }}>
            <i className={isTutor ? 'ri-user-star-fill' : 'ri-graduation-cap-fill'}></i>
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {isTutor ? 'Set Up Your Tutor Profile' : 'Complete Your Profile'}
          </h2>
          <p style={{ color: 'var(--text-light)' }}>
            {isTutor
              ? 'Fill in your teaching details so parents can find and book you.'
              : 'Tell us about your child so we can find the best tutors for them.'}
          </p>
        </div>

        {error && (
          <div style={{ color: '#dc2626', marginBottom: '1.5rem', padding: '1rem', background: '#fee2e2', borderRadius: '0.5rem', textAlign: 'center' }}>
            <i className="ri-error-warning-line"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {isTutor ? (
            <>
              {/* Tutor Setup */}
              <div>
                <label style={labelStyle}>Subjects You Teach *</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {allSubjects.map(sub => (
                    <span key={sub} onClick={() => toggleItem(subjects, setSubjects, sub)} style={chipStyle(subjects.includes(sub))}>
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Class Levels *</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[...Array(12)].map((_, i) => {
                    const cls = `Class ${i + 1}`;
                    return (
                      <span key={cls} onClick={() => toggleItem(classLevels, setClassLevels, cls)} style={chipStyle(classLevels.includes(cls))}>
                        {cls}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Boards *</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {allBoards.map(b => (
                    <span key={b} onClick={() => toggleItem(boards, setBoards, b)} style={chipStyle(boards.includes(b))}>
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Hourly Rate (₹) *</label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="e.g. 500"
                  style={inputStyle}
                  min="1"
                />
              </div>

              <div>
                <label style={labelStyle}>Short Bio *</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell parents about your experience, teaching style, and achievements..."
                  rows="4"
                  style={inputStyle}
                ></textarea>
              </div>

              <div>
                <label style={labelStyle}>Weekly Availability</label>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1rem' }}>Set your available time slots for each day.</p>
                {allDays.map(day => (
                  <div key={day} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold' }}>{day}</span>
                      <button type="button" onClick={() => addSlot(day)} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.25rem', padding: '0.25rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        + Add Slot
                      </button>
                    </div>
                    {(availability[day] || []).map((slot, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <input type="time" value={slot.start} onChange={(e) => updateSlot(day, idx, 'start', e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
                        <span>to</span>
                        <input type="time" value={slot.end} onChange={(e) => updateSlot(day, idx, 'end', e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
                        <button type="button" onClick={() => removeSlot(day, idx)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    ))}
                    {(!availability[day] || availability[day].length === 0) && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>No slots added — day off</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Parent/Student Setup */}
              <div>
                <label style={labelStyle}>Student's Full Name *</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student's name"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Class Level *</label>
                <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} style={inputStyle}>
                  <option value="">Select Class</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={`Class ${i + 1}`}>Class {i + 1}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Board *</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {allBoards.map(b => (
                    <span key={b} onClick={() => toggleItem(studentBoard, setStudentBoard, b)} style={chipStyle(studentBoard.includes(b))}>
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  style={inputStyle}
                />
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '1rem', fontSize: '1.1rem', justifyContent: 'center', marginTop: '1rem' }}>
            {loading ? 'Saving...' : 'Complete Setup →'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default SetupProfile;
