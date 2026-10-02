import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const TINTS = ['tint-0', 'tint-2', 'tint-1', 'tint-3', 'tint-4'];

function SetupProfile() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isTutor = userData?.role === 'tutor';

  // Parent / Student
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentBoard, setStudentBoard] = useState([]);
  const [phone, setPhone] = useState('');
  // Tutor
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [boards, setBoards] = useState([]);
  const [availability, setAvailability] = useState({});
  // Location
  const [city, setCity] = useState(userData?.city || '');
  const [locationObj, setLocationObj] = useState(userData?.location || null);
  const [locLoading, setLocLoading] = useState(false);

  const allSubjects = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physics', 'Chemistry', 'Biology'];
  const allBoards = ['State', 'CBSE', 'ICSE'];
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => { if (userData?.profileComplete) navigate('/'); }, [userData, navigate]);

  const toggleItem = (arr, setArr, item) => setArr(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  const addSlot = (day) => setAvailability({ ...availability, [day]: [...(availability[day] || []), { start: '09:00', end: '10:00' }] });
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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationObj({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocLoading(false);
      },
      (err) => {
        setError('Failed to get location. Please allow location access or type your city manually.');
        setLocLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      if (isTutor) {
        if (subjects.length === 0) throw new Error('Please select at least one subject.');
        if (classLevels.length === 0) throw new Error('Please select at least one class level.');
        if (boards.length === 0) throw new Error('Please select at least one board.');
        if (!hourlyRate || Number(hourlyRate) <= 0) throw new Error('Please enter a valid hourly rate.');
        if (!bio.trim()) throw new Error('Please write a short bio.');
        if (!city.trim()) throw new Error('Please enter your city.');
        await updateDoc(userRef, { subjects, classLevels, boards, hourlyRate: Number(hourlyRate), bio: bio.trim(), availability, city: city.trim(), location: locationObj, profileComplete: true });
      } else {
        if (!studentName.trim()) throw new Error("Please enter the student's name.");
        if (!studentClass) throw new Error('Please select the class level.');
        if (studentBoard.length === 0) throw new Error('Please select at least one board.');
        if (!city.trim()) throw new Error('Please enter your city.');
        await updateDoc(userRef, { studentName: studentName.trim(), studentClass, studentBoard, phone: phone.trim(), city: city.trim(), location: locationObj, profileComplete: true });
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (!userData) return <div className="page"><div className="spinner-container"><div className="spinner"></div></div></div>;
  if (userData.profileComplete) return null;

  const hasSlots = Object.values(availability).some(s => s?.length);
  const steps = isTutor
    ? [
        { label: 'Teaching', sub: 'Subjects, classes, boards', done: subjects.length && classLevels.length && boards.length },
        { label: 'Availability', sub: 'Weekly time slots', done: hasSlots },
        { label: 'Bio & rate', sub: 'What parents will read', done: bio.trim() && Number(hourlyRate) > 0 },
        { label: 'Location', sub: 'City & GPS', done: city.trim().length > 0 }
      ]
    : [
        { label: 'Student', sub: "Student's full name", done: studentName.trim() },
        { label: 'Class & board', sub: 'So we match the syllabus', done: studentClass && studentBoard.length },
        { label: 'Location & Contact', sub: 'City & Phone', done: city.trim().length > 0 }
      ];
  const currentIdx = steps.findIndex(s => !s.done);
  const stepClass = (s, i) => (s.done ? 'done' : i === currentIdx ? 'current' : '');
  const firstChild = studentName.trim().split(' ')[0];

  return (
    <div className="setup-page">
      <aside className="setup-side">
        <div>
          <h2>{isTutor ? 'Set Up Your Tutor Profile' : 'Complete Your Profile'}</h2>
          <p style={{ marginTop: '0.6rem' }}>{isTutor ? 'Fill in your teaching details so parents can find and book you.' : 'Tell us about your child so we can find the best tutors for them.'}</p>
        </div>
        <div className="setup-steps">
          {steps.map((s, i) => (
            <div key={s.label} className={`setup-step ${stepClass(s, i)}`}>
              <span className="dot"><i className={s.done ? 'ri-check-line' : i === currentIdx ? 'ri-pencil-fill' : 'ri-checkbox-blank-circle-line'}></i></span>
              <div><b>{s.label}</b><small>{s.sub}</small></div>
            </div>
          ))}
        </div>
        {isTutor && <div className="alert alert-warning" style={{ margin: 0 }}><i className="ri-information-line"></i><p>Your profile is reviewed by our team before parents can find you.</p></div>}
      </aside>

      <form className="setup-card" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error" style={{ margin: 0 }}><i className="ri-error-warning-line"></i><p>{error}</p></div>}

        {isTutor ? (
          <>
            <div className="setup-section">
              <h3>Subjects You Teach *</h3>
              <div className="chip-row">
                {allSubjects.map(sub => <button type="button" key={sub} className={`chip soft ${subjects.includes(sub) ? 'active' : ''}`} onClick={() => toggleItem(subjects, setSubjects, sub)}>{sub}</button>)}
              </div>
            </div>
            <div className="setup-section">
              <h3>Class Levels *</h3>
              <div className="class-tiles">
                {[...Array(12)].map((_, i) => {
                  const cls = `Class ${i + 1}`;
                  return <button type="button" key={cls} className={`class-tile ${TINTS[i % 5]} ${classLevels.includes(cls) ? 'active' : ''}`} onClick={() => toggleItem(classLevels, setClassLevels, cls)}>{i + 1}</button>;
                })}
              </div>
            </div>
            <div className="setup-section">
              <h3>Boards *</h3>
              <div className="chip-row">{allBoards.map(b => <button type="button" key={b} className={`chip soft ${boards.includes(b) ? 'active' : ''}`} onClick={() => toggleItem(boards, setBoards, b)}>{b}</button>)}</div>
            </div>
            <div className="setup-section">
              <h3>Weekly Availability</h3>
              <p style={{ fontSize: '0.875rem', marginTop: '-0.3rem' }}>Set your available time slots for each day.</p>
              <div className="avail-grid-2">
                {allDays.map(day => (
                  <div key={day} className="avail-day">
                    <div className="avail-day-head"><b>{day}</b><button type="button" className="btn btn-sm" style={{ height: 34 }} onClick={() => addSlot(day)}>+ Add Slot</button></div>
                    {(availability[day] || []).map((slot, idx) => (
                      <div key={idx} className="avail-slot">
                        <input className="input" type="time" value={slot.start} onChange={(e) => updateSlot(day, idx, 'start', e.target.value)} />
                        <span className="muted">to</span>
                        <input className="input" type="time" value={slot.end} onChange={(e) => updateSlot(day, idx, 'end', e.target.value)} />
                        <button type="button" className="icon-btn" onClick={() => removeSlot(day, idx)} aria-label="Remove slot" style={{ color: 'var(--danger)' }}><i className="ri-delete-bin-line"></i></button>
                      </div>
                    ))}
                    {!(availability[day] || []).length && <p style={{ fontSize: '0.8rem' }}>No slots added — day off</p>}
                  </div>
                ))}
              </div>
            </div>
            <div className="setup-section">
              <h3>Hourly Rate (₹) *</h3>
              <input className="input" type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="e.g. 500" min="1" style={{ maxWidth: 240 }} />
            </div>
            <div className="setup-section">
              <h3>Short Bio *</h3>
              <textarea className="textarea" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell parents about your experience, teaching style, and achievements..." rows="4"></textarea>
            </div>
          </>
        ) : (
          <>
            <div className="setup-section">
              <h3>Student's Full Name *</h3>
              <input className="input" type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Enter student's name" />
            </div>
            <div className="setup-section">
              <h1 style={{ fontSize: 'clamp(1.8rem, 3.4vw, 2.8rem)' }}>Which class is {firstChild || 'your child'} in?</h1>
              <div className="class-tiles">
                {[...Array(12)].map((_, i) => {
                  const cls = `Class ${i + 1}`;
                  return <button type="button" key={cls} className={`class-tile ${TINTS[i % 5]} ${studentClass === cls ? 'active' : ''}`} onClick={() => setStudentClass(cls)}>{i + 1}</button>;
                })}
              </div>
            </div>
            <div className="setup-section">
              <h3>Board *</h3>
              <div className="chip-row">{allBoards.map(b => <button type="button" key={b} className={`chip soft ${studentBoard.includes(b) ? 'active' : ''}`} onClick={() => toggleItem(studentBoard, setStudentBoard, b)}>{studentBoard.includes(b) && <i className="ri-check-line"></i>}{b}</button>)}</div>
            </div>
            <div className="setup-section">
              <h3>Phone Number <span className="muted" style={{ fontWeight: 600 }}>(Optional)</span></h3>
              <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" style={{ maxWidth: 320 }} />
            </div>
          </>
        )}

        <div className="setup-section">
          <h3>Location *</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '-0.3rem', marginBottom: '0.8rem' }}>Enter your city/area so we can find matches near you.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input className="input" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Kochi, Kerala" style={{ flex: 1, minWidth: '200px' }} required />
            <button type="button" className="btn btn-outline" onClick={handleDetectLocation} disabled={locLoading}>
              {locLoading ? 'Detecting...' : <><i className="ri-map-pin-line"></i> {locationObj ? 'GPS Saved' : 'Detect GPS'}</>}
            </button>
          </div>
          {locationObj && <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.4rem', fontWeight: 600 }}><i className="ri-check-line"></i> Precise coordinates captured securely.</div>}
        </div>

        <div className="setup-actions">
          <button type="submit" className="btn btn-lg" disabled={loading}>{loading ? 'Saving...' : <>Complete Setup <i className="ri-arrow-right-line"></i></>}</button>
        </div>
      </form>
    </div>
  );
}

export default SetupProfile;
