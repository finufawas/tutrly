import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import Avatar from '../components/Avatar';
import { useFeedback } from '../components/Feedback';
import { fetchFeeSettings, effectiveFee, takeHome } from '../utils/fees';

const getCroppedImg = (imageSrc, pixelCrop) => new Promise((resolve, reject) => {
  const image = new Image();
  image.src = imageSrc;
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 250;
    canvas.height = 250;
    canvas.getContext('2d').drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 250, 250);
    resolve(canvas.toDataURL('image/jpeg', 0.8));
  };
  image.onerror = reject;
});

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMPTY_WEEK = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] };
const CLASSES = [...Array(12)].map((_, i) => `Class ${i + 1}`);
const BOARDS = ['State', 'CBSE', 'ICSE'];
const TINTS = ['tint-0', 'tint-2', 'tint-1', 'tint-3', 'tint-4'];

function EditProfile() {
  const { currentUser, userData } = useAuth();
  const { toast } = useFeedback();
  const navigate = useNavigate();
  const isTutor = userData?.role === 'tutor';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initial, setInitial] = useState(null);
  const [formData, setFormData] = useState({ name: '', city: '', bio: '', hourlyRate: '', subjects: [], classLevels: [], boards: [], photoURL: '', location: null, availability: EMPTY_WEEK });
  const [subjectInput, setSubjectInput] = useState('');
  const [newSlot, setNewSlot] = useState({ day: 'Monday', start: '', end: '' });
  const [locLoading, setLocLoading] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [fee, setFee] = useState(5);

  useEffect(() => {
    if (userData) {
      const d = {
        name: userData.name || '', city: userData.city || '', bio: userData.bio || '', hourlyRate: userData.hourlyRate || '',
        subjects: userData.subjects || [], classLevels: userData.classLevels || [], boards: userData.boards || [],
        photoURL: userData.photoURL || '', location: userData.location || null,
        availability: { ...EMPTY_WEEK, ...(userData.availability || {}) }
      };
      setFormData(d);
      setInitial(d);
    }
    fetchFeeSettings().then(s => setFee(effectiveFee(s)));
  }, [userData]);

  const changes = useMemo(() => {
    if (!initial) return 0;
    return Object.keys(formData).filter(k => JSON.stringify(formData[k]) !== JSON.stringify(initial[k])).length;
  }, [formData, initial]);

  const set = (patch) => setFormData(prev => ({ ...prev, ...patch }));
  const toggle = (field, item) => setFormData(prev => {
    const list = prev[field] || [];
    return { ...prev, [field]: list.includes(item) ? list.filter(i => i !== item) : [...list, item] };
  });

  const handleAddSubject = (e) => {
    e?.preventDefault();
    const s = subjectInput.trim();
    if (s && !formData.subjects.includes(s)) { set({ subjects: [...formData.subjects, s] }); setSubjectInput(''); }
  };

  const handleAddSlot = () => {
    if (!newSlot.start || !newSlot.end) { toast('Please select both start and end times.', 'warning'); return; }
    if (newSlot.start >= newSlot.end) { toast('Pick a later end time for this slot.', 'warning', { title: 'End time must be after start' }); return; }
    set({ availability: { ...formData.availability, [newSlot.day]: [...(formData.availability[newSlot.day] || []), { start: newSlot.start, end: newSlot.end }].sort((a, b) => a.start.localeCompare(b.start)) } });
    setNewSlot({ ...newSlot, start: '', end: '' });
  };

  const handleRemoveSlot = (day, index) => {
    const slots = [...formData.availability[day]];
    slots.splice(index, 1);
    set({ availability: { ...formData.availability, [day]: slots } });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { toast('Geolocation is not supported by your browser.', 'error'); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { set({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }); setLocLoading(false); toast('Precise location saved'); },
      () => { setLocLoading(false); toast('Failed to get location. Please allow location access.', 'error'); },
      { enableHighAccuracy: true }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setCropSrc(event.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const confirmCrop = async () => {
    try {
      set({ photoURL: await getCroppedImg(cropSrc, croppedAreaPixels) });
      setCropSrc(null);
    } catch (e) {
      console.error(e);
      toast('Error cropping image', 'error');
    }
  };

  const discard = () => { if (initial) setFormData(initial); };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { name: formData.name, city: formData.city, photoURL: formData.photoURL, location: formData.location };
      if (isTutor) Object.assign(payload, {
        bio: formData.bio, hourlyRate: Number(formData.hourlyRate), subjects: formData.subjects,
        classLevels: formData.classLevels, boards: formData.boards, availability: formData.availability
      });
      await updateDoc(doc(db, 'users', currentUser.uid), payload);
      toast('Profile saved');
      navigate('/profile');
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
    }
    setLoading(false);
  };

  const done = {
    basics: formData.name.trim() && formData.city.trim(),
    teaching: formData.subjects.length && formData.classLevels.length && formData.boards.length,
    rate: Number(formData.hourlyRate) > 0,
    availability: DAYS.some(d => formData.availability[d]?.length),
    bio: formData.bio.trim()
  };
  const sections = isTutor
    ? [['basics', 'Basics', 'ri-user-3-line'], ['teaching', 'Teaching', 'ri-book-open-line'], ['rate', 'Rate & fee', 'ri-money-rupee-circle-line'], ['availability', 'Availability', 'ri-calendar-2-line'], ['bio', 'Bio', 'ri-quill-pen-line']]
    : [['basics', 'Basics', 'ri-user-3-line']];

  return (
    <div className="page">
      <form className="edit-grid" onSubmit={handleSubmit}>
        <nav className="edit-nav">
          <button type="button" className="back-btn" style={{ background: 'var(--surface-2)', alignSelf: 'flex-start' }} onClick={() => navigate('/profile')}><i className="ri-arrow-left-line"></i>Back to profile</button>
          {sections.map(([id, label, icon]) => (
            <a key={id} href={`#sec-${id}`}><i className={icon}></i>{label}<i className={done[id] ? 'ri-checkbox-circle-fill ok' : 'ri-error-warning-fill todo'}></i></a>
          ))}
        </nav>

        <div className="edit-main">
          <div className="dash-head" style={{ marginBottom: 0 }}><h1>{isTutor ? 'Edit Tutor Profile' : 'Edit Profile'}</h1></div>
          {error && <div className="alert alert-error" style={{ margin: 0 }}><i className="ri-error-warning-line"></i><p>{error}</p></div>}

          <section className="tile" id="sec-basics">
            <div className="basics-grid">
              <div className="photo-edit">
                <Avatar user={{ ...userData, photoURL: formData.photoURL, name: formData.name }} size={140} radius={70} />
                <label><i className="ri-camera-line"></i>Change<input type="file" accept="image/*" onChange={handleImageChange} /></label>
              </div>
              <div>
                <label className="field-label">Full Name</label>
                <input className="input" type="text" value={formData.name} onChange={(e) => set({ name: e.target.value })} required />
              </div>
              <div>
                <label className="field-label">City / Location</label>
                <div className="input-with-chip">
                  <input className="input" type="text" value={formData.city} onChange={(e) => set({ city: e.target.value })} placeholder="e.g. Kochi, Kerala" required />
                  <button type="button" className="gps-chip" onClick={detectLocation} disabled={locLoading}>
                    <i className="ri-map-pin-line"></i>{locLoading ? 'Detecting…' : formData.location ? 'GPS saved' : 'Detect GPS'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {isTutor && (
            <>
              <section className="tile" id="sec-teaching">
                <div className="row-between"><h3>Teaching</h3><span className="muted" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Tap to select</span></div>
                <div>
                  <label className="field-label">Subjects</label>
                  <div className="chip-row" style={{ marginBottom: 8 }}>
                    {formData.subjects.map(sub => <span key={sub} className="chip active">{sub}<i className="ri-close-line" onClick={() => set({ subjects: formData.subjects.filter(s => s !== sub) })}></i></span>)}
                  </div>
                  <div className="subject-add">
                    <input className="input" type="text" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} placeholder="Add a subject, e.g. Mathematics" onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubject(e); }} />
                    <button type="button" className="btn-soft" onClick={handleAddSubject}><i className="ri-add-line"></i>Add</button>
                  </div>
                </div>
                <div>
                  <label className="field-label">Class levels</label>
                  <div className="class-tiles twelve">
                    {CLASSES.map((cls, i) => <button type="button" key={cls} className={`class-tile ${TINTS[i % 5]} ${formData.classLevels.includes(cls) ? 'active' : ''}`} onClick={() => toggle('classLevels', cls)}>{i + 1}</button>)}
                  </div>
                </div>
                <div>
                  <label className="field-label">Boards</label>
                  <div className="chip-row">{BOARDS.map(b => <button type="button" key={b} className={`chip soft ${formData.boards.includes(b) ? 'active' : ''}`} onClick={() => toggle('boards', b)}>{b}</button>)}</div>
                </div>
              </section>

              <section className="tile" id="sec-rate">
                <h3>Rate &amp; fee</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="fee-input" style={{ width: 160 }}>
                    <input className="input" type="number" min="0" value={formData.hourlyRate} onChange={(e) => set({ hourlyRate: e.target.value })} required style={{ background: 'var(--surface-2)', paddingLeft: 30 }} />
                    <span style={{ left: 14, right: 'auto' }}>₹</span>
                  </div>
                  {Number(formData.hourlyRate) > 0 && <span className="fee-note">→ ₹{takeHome(formData.hourlyRate, fee)}/hr take-home after the {fee}% platform fee</span>}
                </div>
              </section>

              <section className="tile tile-sky" id="sec-availability">
                <div className="row-between"><h3>Weekly availability</h3></div>
                <div className="add-slot-row">
                  <div><label className="field-label">Day</label><select className="select" value={newSlot.day} onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div><label className="field-label">Start</label><input className="input" type="time" value={newSlot.start} onChange={(e) => setNewSlot({ ...newSlot, start: e.target.value })} /></div>
                  <div><label className="field-label">End</label><input className="input" type="time" value={newSlot.end} onChange={(e) => setNewSlot({ ...newSlot, end: e.target.value })} /></div>
                  <button type="button" className="btn" onClick={handleAddSlot}><i className="ri-add-line"></i>Add slot</button>
                </div>
                <div className="week-builder">
                  {DAYS.map(day => (
                    <div key={day} className="week-col">
                      <b>{day.slice(0, 3)}</b>
                      {(formData.availability[day] || []).map((s, idx) => (
                        <span key={idx} className="slot-pill">{s.start}–{s.end}<i className="ri-close-line" onClick={() => handleRemoveSlot(day, idx)}></i></span>
                      ))}
                      {!(formData.availability[day] || []).length && <span className="off">Day off</span>}
                    </div>
                  ))}
                </div>
              </section>

              <section className="tile" id="sec-bio">
                <h3>Professional bio</h3>
                <textarea className="textarea" value={formData.bio} onChange={(e) => set({ bio: e.target.value })} rows="4" placeholder="Tell parents about your experience and teaching style..."></textarea>
              </section>
            </>
          )}
        </div>

        <div className="save-bar">
          <p>{changes ? `${changes} unsaved change${changes > 1 ? 's' : ''}` : 'No changes yet'}</p>
          <button type="button" className="ghost" onClick={changes ? discard : () => navigate('/profile')}>{changes ? 'Discard' : 'Cancel'}</button>
          <button type="submit" className="btn-on-ink" disabled={loading}>{loading ? 'Saving…' : 'Save profile'}</button>
        </div>
      </form>

      {cropSrc && (
        <div className="dlg-backdrop">
          <div className="dlg" role="dialog" aria-modal="true">
            <span className="dlg-grab"></span>
            <h3>Crop profile photo</h3>
            <div className="crop-box">
              <Cropper image={cropSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={(_, px) => setCroppedAreaPixels(px)} onZoomChange={setZoom} />
            </div>
            <div className="zoom-row"><i className="ri-zoom-out-line"></i><input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /><i className="ri-zoom-in-line"></i></div>
            <div className="dlg-actions">
              <button type="button" className="btn-soft" onClick={() => setCropSrc(null)}>Cancel</button>
              <button type="button" className="btn" onClick={confirmCrop}>Save photo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditProfile;
