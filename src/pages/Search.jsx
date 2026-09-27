import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import tutorPlaceholder from '../assets/images/tutor_1.jpg'; // We'll use this as fallback

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const classParam = searchParams.get('class') || '';
  const subjectParam = searchParams.get('subject') || '';
  const boardParam = searchParams.get('board') || '';
  
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userData } = useAuth();

  useEffect(() => {
    if (userData?.role === 'tutor') {
      navigate('/dashboard');
    }
  }, [userData, navigate]);

  // Form states so they can change the search on this page
  const [classLevel, setClassLevel] = useState(classParam);
  const [subject, setSubject] = useState(subjectParam);
  const [board, setBoard] = useState(boardParam);

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
      const querySnapshot = await getDocs(q);
      
      let results = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });

      // Filter in memory since Firestore can't do multiple array-contains
      results = results.filter(t => t.isVerified === true);

      if (classParam) {
        results = results.filter(t => t.classLevels && t.classLevels.includes(classParam));
      }
      if (subjectParam) {
        results = results.filter(t => t.subjects && t.subjects.some(s => s.toLowerCase().includes(subjectParam.toLowerCase())));
      }
      if (boardParam) {
        results = results.filter(t => t.boards && t.boards.includes(boardParam));
      }

      setTutors(results);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTutors();
  }, [classParam, subjectParam, boardParam]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ class: classLevel, subject: subject, board: board });
  };

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)', background: 'var(--background)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Search Header */}
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Find Your Perfect Tutor</h2>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <select 
              value={classLevel} 
              onChange={(e) => setClassLevel(e.target.value)}
              style={{ flex: '1', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', minWidth: '150px' }}
            >
              <option value="">All Classes</option>
              {[...Array(12)].map((_, i) => (
                <option key={i+1} value={`Class ${i+1}`}>Class {i+1}</option>
              ))}
            </select>

            <select 
              value={board} 
              onChange={(e) => setBoard(e.target.value)}
              style={{ flex: '1', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', minWidth: '150px' }}
            >
              <option value="">All Boards</option>
              <option value="State">State Board</option>
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
            </select>
            
            <input 
              type="text" 
              placeholder="Subject (e.g. Math)"
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              style={{ flex: '1', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', minWidth: '150px' }}
            />
            
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Search</button>
          </form>
        </div>

        {/* Results */}
        <div>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>
            {loading ? 'Searching...' : `Found ${tutors.length} tutor${tutors.length !== 1 ? 's' : ''}`}
          </h3>

          <div className="tutors-grid">
            {tutors.map(tutor => (
              <div key={tutor.id} className="tutor-card">
                <div className="tutor-image">
                  <img src={tutor.photoURL || tutorPlaceholder} alt={tutor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="tutor-info">
                  <div className="tutor-header">
                    <h3>{tutor.name}</h3>
                    <div className="rating"><i className="ri-star-fill"></i> New</div>
                  </div>
                  <p className="tutor-subject">{tutor.subjects?.join(', ') || 'No subjects listed'}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {tutor.boards?.map(b => (
                      <span key={b} style={{ background: 'var(--hover-bg)', color: 'var(--text-light)', padding: '0.1rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>{b}</span>
                    ))}
                  </div>
                  <p className="tutor-classes">{tutor.classLevels?.join(', ') || 'No classes listed'}</p>
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-light)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {tutor.bio || 'This tutor has not added a bio yet.'}
                  </p>
                  <div className="tutor-footer" style={{ marginTop: '1rem' }}>
                    <span className="experience" style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>
                      ₹{tutor.hourlyRate || 0} / hr
                    </span>
                    <Link to={`/tutor/${tutor.id}`} className="btn-outline" style={{ display: 'inline-block', textAlign: 'center' }}>View Profile</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && tutors.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--white)', borderRadius: '1rem' }}>
              <i className="ri-search-line" style={{ fontSize: '3rem', color: '#cbd5e1' }}></i>
              <h3 style={{ marginTop: '1rem', color: 'var(--text-light)' }}>No tutors found</h3>
              <p style={{ color: 'var(--text-light)', marginTop: '0.5rem' }}>Try adjusting your search filters to find more tutors.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Search;
