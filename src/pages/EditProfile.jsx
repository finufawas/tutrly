import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import Avatar from '../components/Avatar';
import { useFeedback } from '../components/Feedback';
import { fetchFeeSettings, effectiveFee, takeHome } from '../utils/fees';
import { toISO, weekdayOf } from '../utils/tutor';

const getCroppedImg = (imageSrc, px) => new Promise((resolve, reject) => {
  const image = new Image();
  image.src = imageSrc;
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 250; canvas.height = 250;
    canvas.getContext('2d').drawImage(image, px.x, px.y, px.width, px.height, 0, 0, 250, 250);
    resolve(canvas.toDataURL('image/jpeg', 0.8));
  };
  image.onerror = reject;
});

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMPTY_WEEK = Object.fromEntries(DAYS.map(d => [d, []]));
const CLASSES = [...Array(12)].map((_, i) => `Class ${i + 1}`);
const BOARDS = ['State', 'CBSE', 'ICSE'];
const SUGGESTED = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physics', 'Chemistry', 'Biology'];
const TINTS = ['tint-0', 'tint-2', 'tint-1', 'tint-3', 'tint-4'];

// "16:30" -> "4:30 PM"
export const to12h = (t = '') => {
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
const duration = (s, e) => { const d = toMin(e) - toMin(s); const h = Math.floor(d / 60), m = d % 60; return d <= 0 ? '' : `${h ? `${h} h ` : ''}${m ? `${m} m` : ''}`.trim(); };
// 6:00 AM → 10:00 PM in 15-minute steps
const TIMES = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => fromMin(6 * 60 + i * 15));

function EditProfile() {
  const { currentUser, userData } = useAuth();
  const { toast, confirm } = useFeedback();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const isTutor = userData?.role === 'tutor';

  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState(null);
  const [form, setForm] = useState({ name: '', city: '', bio: '', hourlyRate: '', subjects: [], classLevels: [], boards: [], photoURL: '', location: null, availability: EMPTY_WEEK });
  const [subjectInput, setSubjectInput] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [fee, setFee] = useState(5);
  const [booked, setBooked] = useState([]); // upcoming bookings → lock overlapping ranges
  const [day, setDay] = useState('Monday');
  const [draft, setDraft] = useState(null); // { day, start, end }
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPx, setCropPx] = useState(null);

  useEffect(() => {
    if (!userData) return;
    const d = {
      name: userData.name || '', city: userData.city || '', bio: userData.bio || '', hourlyRate: userData.hourlyRate || '',
      subjects: userData.subjects || [], classLevels: userData.classLevels || [], boards: userData.boards || [],
      photoURL: userData.photoURL || '', location: userData.location || null,
      availability: { ...EMPTY_WEEK, ...(userData.availability || {}) }
    };
    setForm(d);
    setInitial(d);
    fetchFeeSettings().then(s => setFee(effectiveFee(s)));
  }, [userData]);

  useEffect(() => {
    if (!isTutor || !currentUser) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'bookings'), where('tutorId', '==', currentUser.uid)));
        const today = toISO(new Date());
        const list = [];
        snap.forEach(d => { const b = d.data(); if ((b.status === 'pending' || b.status === 'confirmed') && b.date >= today) list.push(b); });
        setBooked(list);
      } catch (e) { /* locking is best-effort */ }
    })();
  }, [isTutor, currentUser]);

  const set = (patch) => setForm(prev => ({ ...prev, ...patch }));
  const toggle = (field, item) => setForm(prev => {
    const list = prev[field] || [];
    return { ...prev, [field]: list.includes(item) ? list.filter(i => i !== item) : [...list, item] };
  });

  // ---------- sections & completeness ----------
  const done = {
    basics: !!(form.name.trim() && form.city.trim()),
    teaching: !!(form.subjects.length && form.classLevels.length && form.boards.length),
    rate: Number(form.hourlyRate) > 0,
    availability: DAYS.some(d => form.availability[d]?.length),
    bio: form.bio.trim().length >= 40
  };
  const SECTIONS = isTutor
    ? [['basics', 'Basics'], ['teaching', 'Teaching'], ['rate', 'Rate & fee'], ['availability', 'Availability'], ['bio', 'Bio']]
    : [['basics', 'Basics']];
  const tab = SECTIONS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'basics';
  const idx = SECTIONS.findIndex(([id]) => id === tab);
  const pct = Math.round((SECTIONS.filter(([id]) => done[id]).length / SECTIONS.length) * 100);
  const firstMissing = SECTIONS.find(([id]) => !done[id]);
  const goTab = (id) => { setDraft(null); setParams({ tab: id }, { replace: true }); };

  const dirty = useMemo(() => initial && JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  // ---------- availability ----------
  const isLocked = (d, r) => booked.some(b => weekdayOf(b.date) === d && b.startTime < r.end && b.endTime > r.start);

  const openDraft = (d) => {
    const ranges = form.availability[d] || [];
    const last = ranges[ranges.length - 1];
    const start = last ? fromMin(Math.min(toMin(last.end) + 15, 21 * 60)) : '16:00';
    setDraft({ day: d, start, end: fromMin(Math.min(toMin(start) + 60, 22 * 60)) });
  };

  const addRange = () => {
    const { day: d, start, end } = draft;
    if (toMin(end) <= toMin(start)) { toast('Pick an end time after the start time.', 'warning', { title: 'Check the times' }); return; }
    const ranges = form.availability[d] || [];
    if (ranges.some(r => start < r.end && end > r.start)) { toast(`This overlaps another ${d} range.`, 'warning'); return; }
    set({ availability: { ...form.availability, [d]: [...ranges, { start, end }].sort((a, b) => a.start.localeCompare(b.start)) } });
    setDraft(null);
  };

  const removeRange = (d, i) => {
    const r = form.availability[d][i];
    if (isLocked(d, r)) { toast('A booked class falls in this time. Cancel the booking first.', 'warning', { title: 'Time is booked' }); return; }
    set({ availability: { ...form.availability, [d]: form.availability[d].filter((_, j) => j !== i) } });
  };

  const copyToWeekdays = async () => {
    const src = form.availability[day] || [];
    const ok = await confirm({ icon: 'ri-file-copy-line', title: `Copy ${day} to all weekdays?`, message: `Monday–Friday will use ${src.length ? src.map(r => `${to12h(r.start)}–${to12h(r.end)}`).join(', ') : 'no times (day off)'}. Weekend stays as it is.`, confirmText: 'Copy' });
    if (!ok) return;
    const next = { ...form.availability };
    DAYS.slice(0, 5).forEach(d => {
      const locked = (next[d] || []).filter(r => isLocked(d, r));
      next[d] = [...locked, ...src.filter(r => !locked.some(l => r.start < l.end && r.end > l.start))].sort((a, b) => a.start.localeCompare(b.start));
    });
    set({ availability: next });
    toast('Copied to weekdays');
  };


  // ---------- misc handlers ----------
  const addSubject = (s) => {
    const v = (s ?? subjectInput).trim();
    if (v && !form.subjects.includes(v)) set({ subjects: [...form.subjects, v] });
    setSubjectInput('');
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

  const onImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const confirmCrop = async () => {
    try { set({ photoURL: await getCroppedImg(cropSrc, cropPx) }); setCropSrc(null); }
    catch (e) { console.error(e); toast('Error cropping image', 'error'); }
  };

  const save = async (next) => {
    if (!form.name.trim()) { goTab('basics'); toast('Please enter your name.', 'warning'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), city: form.city.trim(), photoURL: form.photoURL, location: form.location };
      if (isTutor) Object.assign(payload, {
        bio: form.bio, hourlyRate: Number(form.hourlyRate), subjects: form.subjects,
        classLevels: form.classLevels, boards: form.boards, availability: form.availability
      });
      await updateDoc(doc(db, 'users', currentUser.uid), payload);
      setInitial(form);
      if (next) goTab(next); else { toast('Profile saved'); navigate('/profile'); }
    } catch (err) {
      toast('Failed to update profile: ' + err.message, 'error');
    }
    setSaving(false);
  };

  const nextId = SECTIONS[idx + 1]?.[0];
  const prevSec = SECTIONS[idx - 1];
  const ranges = form.availability[day] || [];

  // ---------- section bodies ----------
  const body = {
    basics: (
      <>
        <div><h2>Your basics</h2><p>Your photo and city appear on your public profile.</p></div>
        <div className="eb-basics">
          <div className="photo-edit">
            <Avatar user={{ ...userData, photoURL: form.photoURL, name: form.name }} size={140} radius={70} />
            <label><i className="ri-camera-line"></i>Change<input type="file" accept="image/*" onChange={onImage} /></label>
          </div>
          <div className="eb-fields">
            <div><label className="field-label">Full Name</label><input className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} /></div>
            <div>
              <label className="field-label">City / Location</label>
              <div className="input-with-chip">
                <input className="input" value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="e.g. Kochi, Kerala" />
                <button type="button" className="gps-chip" onClick={detectLocation} disabled={locLoading}><i className="ri-map-pin-line"></i>{locLoading ? 'Detecting…' : form.location ? 'GPS saved' : 'Detect GPS'}</button>
              </div>
            </div>
          </div>
        </div>
      </>
    ),
    teaching: (
      <>
        <div><h2>What do you teach?</h2><p>Parents filter by these, so pick everything you're comfortable with.</p></div>
        <div>
          <label className="field-label">Subjects</label>
          <div className="chip-row">
            {form.subjects.map(s => <span key={s} className="chip active">{s}<i className="ri-close-line" onClick={() => set({ subjects: form.subjects.filter(x => x !== s) })}></i></span>)}
            {SUGGESTED.filter(s => !form.subjects.includes(s)).map(s => <button type="button" key={s} className="chip soft" onClick={() => addSubject(s)}><i className="ri-add-line"></i>{s}</button>)}
          </div>
          <div className="subject-add" style={{ marginTop: 8 }}>
            <input className="input" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} placeholder="Other subject…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubject(); } }} />
            <button type="button" className="btn-soft" onClick={() => addSubject()}>Add</button>
          </div>
        </div>
        <div>
          <label className="field-label">Class levels</label>
          <div className="class-tiles twelve">
            {CLASSES.map((c, i) => <button type="button" key={c} className={`class-tile ${TINTS[i % 5]} ${form.classLevels.includes(c) ? 'active' : ''}`} onClick={() => toggle('classLevels', c)}>{i + 1}</button>)}
          </div>
        </div>
        <div>
          <label className="field-label">Boards</label>
          <div className="chip-row">{BOARDS.map(b => <button type="button" key={b} className={`chip soft ${form.boards.includes(b) ? 'active' : ''}`} onClick={() => toggle('boards', b)}>{b}</button>)}</div>
        </div>
      </>
    ),
    rate: (
      <>
        <div><h2>Your hourly rate</h2><p>Existing bookings keep their original rate.</p></div>
        <div className="eb-rate">
          <div className="eb-rate-input"><span>₹</span><input type="number" min="0" value={form.hourlyRate} onChange={(e) => set({ hourlyRate: e.target.value })} /><small>/ hr</small></div>
          <div className="eb-breakdown tile-mint">
            <div><span>Parents pay</span><span>₹{Number(form.hourlyRate) || 0} / hr</span></div>
            <div><span>Platform fee ({fee}%)</span><span>− ₹{(Number(form.hourlyRate) || 0) - takeHome(form.hourlyRate, fee)}</span></div>
            <div className="total"><span>You keep</span><span>₹{takeHome(form.hourlyRate, fee)} / hr</span></div>
          </div>
        </div>
      </>
    ),
    availability: (
      <>
        <div className="row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><h2>When can you teach?</h2><p>Add any time range in 15-minute steps. Parents only see these times.</p></div>
          <div className="chip-row">
            <button type="button" className="chip soft" onClick={copyToWeekdays}><i className="ri-file-copy-line"></i>Copy {day.slice(0, 3)} → weekdays</button>
          </div>
        </div>
        <div className="eb-days">
          {DAYS.map(d => (
            <button type="button" key={d} className={`eb-day ${day === d ? 'active' : ''} ${form.availability[d]?.length ? 'has' : ''}`} onClick={() => { setDay(d); setDraft(null); }}>
              {d.slice(0, 3)}<span className="dot"></span>
            </button>
          ))}
        </div>
        <div className="eb-week">
          {DAYS.map(d => {
            const list = form.availability[d] || [];
            const editing = draft?.day === d;
            return (
              <div key={d} className={`eb-row ${day === d ? 'current' : ''}`} onClick={() => setDay(d)}>
                <b>{d.slice(0, 3)}</b>
                <div className="eb-ranges">
                  {list.map((r, i) => {
                    const locked = isLocked(d, r);
                    return (
                      <span key={i} className={`eb-range ${locked ? 'locked' : ''}`} title={locked ? 'Booked class in this time' : ''}>
                        {to12h(r.start)} – {to12h(r.end)}
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeRange(d, i); }} aria-label="Remove"><i className={locked ? 'ri-lock-line' : 'ri-close-line'}></i></button>
                      </span>
                    );
                  })}
                  {!list.length && !editing && <span className="eb-off">Day off</span>}
                  {editing && (
                    <span className="eb-draft" onClick={(e) => e.stopPropagation()}>
                      <select className="select" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })}>{TIMES.slice(0, -1).map(t => <option key={t} value={t}>{to12h(t)}</option>)}</select>
                      <span className="muted">to</span>
                      <select className="select" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })}>{TIMES.slice(1).map(t => <option key={t} value={t}>{to12h(t)}</option>)}</select>
                      <span className="eb-dur">{duration(draft.start, draft.end)}</span>
                      <button type="button" className="btn btn-icon" style={{ width: 38, height: 38 }} onClick={addRange} aria-label="Add range"><i className="ri-check-line"></i></button>
                      <button type="button" className="icon-btn" onClick={() => setDraft(null)} aria-label="Cancel"><i className="ri-close-line"></i></button>
                    </span>
                  )}
                </div>
                {!editing && <button type="button" className="chip soft eb-add" onClick={(e) => { e.stopPropagation(); setDay(d); openDraft(d); }}><i className="ri-add-line"></i>Add time</button>}
              </div>
            );
          })}
        </div>
        <div className="eb-legend"><span><i style={{ background: 'var(--lilac)' }}></i>Available</span><span><i style={{ background: 'var(--peach)' }}></i>Booked (locked)</span></div>
      </>
    ),
    bio: (
      <>
        <div><h2>Introduce yourself</h2><p>Your experience, teaching style and results. At least 40 characters.</p></div>
        <textarea className="textarea" rows="7" maxLength={600} value={form.bio} onChange={(e) => set({ bio: e.target.value })} placeholder="Tell parents about your experience and teaching style..."></textarea>
        <span className={form.bio.trim().length >= 40 ? 'count-ok' : 'count-bad'}>{form.bio.length} / 600</span>
      </>
    )
  };

  return (
    <div className="page">
      <div className="eb-wrap">
        <div className="eb-head">
          {isTutor && (
            <div className="eb-ring" style={{ background: `conic-gradient(var(--accent) 0 ${pct}%, var(--line) ${pct}% 100%)` }}><span>{pct}%</span></div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1>{isTutor ? 'Edit Tutor Profile' : 'Edit Profile'}</h1>
            {isTutor && <p>{firstMissing ? `Finish "${firstMissing[1]}" to complete your profile` : 'Your profile is complete'}</p>}
          </div>
          {isTutor && <Link to={`/tutor/${currentUser?.uid}`} className="btn-light"><i className="ri-eye-line"></i><span className="hide-sm">View public profile</span></Link>}
        </div>

        {SECTIONS.length > 1 && (
          <>
            <div className="eb-tabs">
              {SECTIONS.map(([id, label]) => (
                <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => goTab(id)}>
                  <i className={done[id] ? 'ri-checkbox-circle-fill ok' : 'ri-error-warning-fill todo'}></i>{label}
                </button>
              ))}
            </div>
            <div className="eb-progress">{SECTIONS.map(([id], i) => <span key={id} className={i < idx ? 'past' : i === idx ? 'now' : ''}></span>)}</div>
          </>
        )}

        <section className="eb-card">{body[tab]}</section>

        <div className="eb-foot">
          {prevSec ? <button type="button" className="btn-light btn-lg" onClick={() => goTab(prevSec[0])}><i className="ri-arrow-left-line"></i><span className="hide-sm">{prevSec[1]}</span></button> : <button type="button" className="btn-light btn-lg" onClick={() => navigate('/profile')}><i className="ri-arrow-left-line"></i><span className="hide-sm">Back</span></button>}
          <div className="eb-foot-right">
            {nextId && <button type="button" className="btn-light btn-lg hide-sm" disabled={saving || !dirty} onClick={() => save()}>Save</button>}
            <button type="button" className="btn btn-lg" disabled={saving} onClick={() => save(nextId)}>
              {saving ? 'Saving…' : nextId ? <>Save &amp; next<span className="hide-sm">: {SECTIONS[idx + 1][1]}</span> <i className="ri-arrow-right-line"></i></> : 'Save profile'}
            </button>
          </div>
        </div>
      </div>

      {cropSrc && (
        <div className="dlg-backdrop">
          <div className="dlg" role="dialog" aria-modal="true">
            <span className="dlg-grab"></span>
            <h3>Crop profile photo</h3>
            <div className="crop-box">
              <Cropper image={cropSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={(_, px) => setCropPx(px)} onZoomChange={setZoom} />
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
