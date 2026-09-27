import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { classRange, availabilityTags } from '../utils/tutor';

const BOARDS = [
  { value: '', label: 'All' },
  { value: 'CBSE', label: 'CBSE' },
  { value: 'ICSE', label: 'ICSE' },
  { value: 'State', label: 'State' }
];
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (userData?.role === 'tutor') navigate('/dashboard');
  }, [userData, navigate]);

  useEffect(() => { setSubject(subjectParam); }, [subjectParam]);

  useEffect(() => {
    const fetchTutors = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
        const querySnapshot = await getDocs(q);
        let results = [];
        querySnapshot.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));

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

  const applySubject = (e) => {
    e.preventDefault();
    setParam('subject', subject.trim());
  };

  const clearAll = () => {
    setSubject('');
    setMaxPrice(PRICE_MAX);
    setEvenings(false);
    setWeekends(false);
    setSearchParams({});
  };

  // Client-side filters (price / availability) + sort
  const visible = useMemo(() => {
    let list = tutors.filter(t => (Number(t.hourlyRate) || 0) <= maxPrice);
    if (evenings) list = list.filter(t => availabilityTags(t.availability).weekdayEvenings);
    if (weekends) list = list.filter(t => availabilityTags(t.availability).weekends);
    if (sort === 'price-asc') list = [...list].sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
    if (sort === 'price-desc') list = [...list].sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
    return list;
  }, [tutors, maxPrice, evenings, weekends, sort]);

  const activeChips = [
    classParam && { label: classParam, clear: () => setParam('class', '') },
    boardParam && { label: boardParam, clear: () => setParam('board', '') },
    subjectParam && { label: subjectParam, clear: () => setParam('subject', '') },
    maxPrice < PRICE_MAX && { label: `Under ₹${maxPrice}`, clear: () => setMaxPrice(PRICE_MAX) },
    evenings && { label: 'Weekday evenings', clear: () => setEvenings(false) },
    weekends && { label: 'Weekends', clear: () => setWeekends(false) }
  ].filter(Boolean);

  const title = [classParam, subjectParam].filter(Boolean).join(' · ');

  return (
    <div className="page">
      <div className="container">

        {/* Mobile: summary bar + active filter chips */}
        <div className="mobile-filter-bar" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <form onSubmit={applySubject} className="subject-input" style={{ flex: 1 }}>
              <i className="ri-search-line"></i>
              <input className="input" placeholder="Subject (e.g. Math)" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </form>
            <button className="btn-outline" onClick={() => setFiltersOpen(o => !o)} aria-label="Filters">
              <i className="ri-equalizer-line"></i>{activeChips.length > 0 && <span className="pill pill-danger">{activeChips.length}</span>}
            </button>
          </div>
          {activeChips.length > 0 && (
            <div className="chip-row">
              {activeChips.map(c => (
                <button key={c.label} className="chip chip-round active" onClick={c.clear}>{c.label} <i className="ri-close-line"></i></button>
              ))}
            </div>
          )}
        </div>

        <div className="search-layout">
          <aside className={`filters ${filtersOpen ? 'open' : ''}`}>
            <div className="filters-head">
              <h3>Filters</h3>
              <button onClick={clearAll}>Clear all</button>
            </div>

            <form className="filter-group" onSubmit={applySubject}>
              <div className="filter-label">Subject</div>
              <div className="subject-input">
                <i className="ri-book-2-line"></i>
                <input className="input" placeholder="e.g. Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} onBlur={() => subject !== subjectParam && setParam('subject', subject.trim())} />
              </div>
            </form>

            <div className="filter-group">
              <div className="filter-label">Class</div>
              <div className="class-grid">
                {[...Array(12)].map((_, i) => {
                  const cls = `Class ${i + 1}`;
                  return (
                    <button key={cls} className={`chip ${classParam === cls ? 'active' : ''}`} onClick={() => setParam('class', classParam === cls ? '' : cls)}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-label">Board</div>
              <div className="chip-row">
                {BOARDS.map(b => (
                  <button key={b.label} className={`chip ${boardParam === b.value ? 'active' : ''}`} onClick={() => setParam('board', b.value)}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-label">Price / hour <span>{maxPrice >= PRICE_MAX ? 'Any' : `Up to ₹${maxPrice}`}</span></div>
              <input type="range" className="range" min="100" max={PRICE_MAX} step="50" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
            </div>

            <div className="filter-group">
              <div className="filter-label">Available</div>
              <div className="chip-row">
                <button className={`chip soft ${evenings ? 'active' : ''}`} onClick={() => setEvenings(v => !v)}>Weekday evenings</button>
                <button className={`chip soft ${weekends ? 'active' : ''}`} onClick={() => setWeekends(v => !v)}>Weekends</button>
              </div>
            </div>

            <div className="toggle-row">
              <span><i className="ri-shield-check-fill verified"></i> Verified tutors only</span>
              <span className="pill pill-success">Always on</span>
            </div>
          </aside>

          <div className="results">
            <div className="results-head">
              <h2>
                {loading ? 'Searching...' : `${visible.length} tutor${visible.length !== 1 ? 's' : ''}${title ? ` for ${title}` : ''}`}
              </h2>
              <select className="select sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">Sort: Recommended</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
              </select>
            </div>

            {loading ? (
              <div className="spinner-container"><div className="spinner"></div></div>
            ) : visible.length === 0 ? (
              <div className="empty-state">
                <i className="ri-search-line"></i>
                <h3>No tutors found</h3>
                <p>Try adjusting your search filters to find more tutors.</p>
              </div>
            ) : (
              visible.map(tutor => (
                <div key={tutor.id} className="result-row">
                  <div className="result-top">
                    <Link to={`/tutor/${tutor.id}`}><Avatar user={tutor} size={104} radius={14} /></Link>
                    <div className="result-body">
                      <div className="result-name">
                        <Link to={`/tutor/${tutor.id}`}><h3>{tutor.name}</h3></Link>
                        <span className="pill pill-success"><i className="ri-shield-check-fill"></i>Verified</span>
                      </div>
                      <p className="result-sub">{tutor.subjects?.join(', ') || 'No subjects listed'} · {classRange(tutor.classLevels)}</p>
                      <p className="result-bio">{tutor.bio || 'This tutor has not added a bio yet.'}</p>
                      <div className="result-meta">
                        <span><i className="ri-star-fill star"></i> {tutor.rating ? tutor.rating.toFixed(1) : 'New'}</span>
                        {tutor.boards?.map(b => <span key={b} className="tag">{b}</span>)}
                      </div>
                    </div>
                  </div>
                  <div className="result-side">
                    <p className="price" style={{ margin: 0 }}>₹{tutor.hourlyRate || 0}<small> /hr</small></p>
                    <Link to={`/book/${tutor.id}`} className="btn-primary btn-sm">Book a Class</Link>
                    <Link to={`/tutor/${tutor.id}`} className="btn-outline btn-sm">View Profile</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Search;
