import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import TutorCard from '../components/TutorCard';
import { availabilityTags } from '../utils/tutor';

const PRICE_MAX = 2000;

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const classParam = searchParams.get('class') || '';
  const subjectParam = searchParams.get('subject') || '';
  const boardParam = searchParams.get('board') || '';

  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [subject, setSubject] = useState(subjectParam);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [evenings, setEvenings] = useState(false);
  const [weekends, setWeekends] = useState(false);
  const [sort, setSort] = useState('recommended');
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => { if (userData?.role === 'tutor') navigate('/dashboard'); }, [userData, navigate]);
  useEffect(() => { setSubject(subjectParam); }, [subjectParam]);

  useEffect(() => {
    const fetchTutors = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
        const snap = await getDocs(q);
        let results = [];
        snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
        results = results.filter(t => t.isVerified === true);
        if (classParam) results = results.filter(t => t.classLevels?.includes(classParam));
        if (subjectParam) results = results.filter(t => t.subjects?.some(s => s.toLowerCase().includes(subjectParam.toLowerCase())));
        if (boardParam) results = results.filter(t => t.boards?.includes(boardParam));
        setTutors(results);
      } catch (error) {
        console.error('Error fetching tutors:', error);
      }
      setLoading(false);
    };
    fetchTutors();
  }, [classParam, subjectParam, boardParam]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  const applySubject = (e) => { e.preventDefault(); setParam('subject', subject.trim()); };

  const clearAll = () => {
    setSubject(''); setMaxPrice(PRICE_MAX); setEvenings(false); setWeekends(false); setSearchParams({});
  };

  const visible = useMemo(() => {
    let list = tutors.filter(t => (Number(t.hourlyRate) || 0) <= maxPrice);
    if (evenings) list = list.filter(t => availabilityTags(t.availability).weekdayEvenings);
    if (weekends) list = list.filter(t => availabilityTags(t.availability).weekends);
    if (sort === 'price-asc') list = [...list].sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
    if (sort === 'price-desc') list = [...list].sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
    return list;
  }, [tutors, maxPrice, evenings, weekends, sort]);

  const anyFilter = classParam || boardParam || subjectParam || maxPrice < PRICE_MAX || evenings || weekends;
  const child = userData?.studentName?.split(' ')[0];

  return (
    <div className="page">
      <div className="container">
        <form className="query-bar" onSubmit={applySubject}>
          <div className="qf">
            <select value={classParam} onChange={(e) => setParam('class', e.target.value)}>
              <option value="">Any class</option>
              {[...Array(12)].map((_, i) => <option key={i + 1} value={`Class ${i + 1}`}>Class {i + 1}</option>)}
            </select>
          </div>
          <div className="qf"><input placeholder="Subject (e.g. Math)" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="qf">
            <select value={boardParam} onChange={(e) => setParam('board', e.target.value)}>
              <option value="">Any board</option>
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
              <option value="State">State Board</option>
            </select>
          </div>
          <button type="submit" className="btn btn-icon" aria-label="Search"><i className="ri-search-line"></i></button>
        </form>

        <div className="search-head">
          <h1>
            {loading ? 'Searching…' : `${visible.length} tutor${visible.length !== 1 ? 's' : ''}`}
            {child && !loading && <span className="accent"> for {child}</span>}
          </h1>
          <div className="filter-row">
            <button className={`chip ${!evenings && !weekends ? 'active' : ''}`} onClick={() => { setEvenings(false); setWeekends(false); }}>All</button>
            <button className={`chip ${evenings ? 'active' : ''}`} onClick={() => setEvenings(v => !v)}>Evenings</button>
            <button className={`chip ${weekends ? 'active' : ''}`} onClick={() => setWeekends(v => !v)}>Weekends</button>
            <button className={`chip ${maxPrice < PRICE_MAX ? 'active' : ''}`} onClick={() => setPanelOpen(true)}>{maxPrice < PRICE_MAX ? `Under ₹${maxPrice}` : 'Price'}</button>
            <select className="chip" value={sort} onChange={(e) => setSort(e.target.value)} style={{ appearance: 'none' }}>
              <option value="recommended">Recommended</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
            <button className="chip" onClick={() => setPanelOpen(o => !o)} aria-label="More filters"><i className="ri-equalizer-line"></i></button>
            {anyFilter && <button className="chip soft" onClick={clearAll}>Clear</button>}
          </div>
        </div>

        <div className={`filter-panel ${panelOpen ? 'open' : ''}`}>
          <div className="filter-group">
            <div className="filter-label">Class</div>
            <div className="class-grid">
              {[...Array(12)].map((_, i) => {
                const cls = `Class ${i + 1}`;
                return <button key={cls} className={`chip soft ${classParam === cls ? 'active' : ''}`} onClick={() => setParam('class', classParam === cls ? '' : cls)}>{i + 1}</button>;
              })}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">Price / hour <span>{maxPrice >= PRICE_MAX ? 'Any' : `Up to ₹${maxPrice}`}</span></div>
            <input type="range" className="range" min="100" max={PRICE_MAX} step="50" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
          </div>
          <div className="filter-group">
            <div className="filter-label">Board</div>
            <div className="chip-row">
              {['', 'CBSE', 'ICSE', 'State'].map(b => (
                <button key={b || 'all'} className={`chip soft ${boardParam === b ? 'active' : ''}`} onClick={() => setParam('board', b)}>{b || 'All'}</button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="spinner-container"><div className="spinner"></div></div>
        ) : visible.length === 0 ? (
          <div className="empty-state"><i className="ri-search-line"></i><h3>No tutors found</h3><p>Try adjusting your search filters to find more tutors.</p></div>
        ) : (
          <div className="tutor-grid">{visible.map(t => <TutorCard key={t.id} tutor={t} />)}</div>
        )}
      </div>
    </div>
  );
}

export default Search;
