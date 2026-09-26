import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import tutorPlaceholder from '../assets/images/tutor_1.jpg'; // We'll use this as fallback

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const classParam = searchParams.get('class') || '';
  const subjectParam = searchParams.get('subject') || '';
  
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states so they can change the search on this page
  const [classLevel, setClassLevel] = useState(classParam);
  const [subject, setSubject] = useState(subjectParam);

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
      if (classParam) {
        results = results.filter(t => t.classLevels && t.classLevels.includes(classParam));
      }
      if (subjectParam) {
        results = results.filter(t => t.subjects && t.subjects.includes(subjectParam));
      }

      setTutors(results);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTutors();
  }, [classParam, subjectParam]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ class: classLevel, subject: subject });
  };

  return (
    <div style={{ padding: '8rem 5% 4rem', minHeight: 'calc(100vh - 100px)', background: '#f8fafc' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Search Header */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Find Your Perfect Tutor</h2>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <select 
              value={classLevel} 
              onChange={(e) => setClassLevel(e.target.value)}
              style={{ flex: '1', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '200px' }}
            >
              <option value="">All Classes</option>
              <option value="Class 1-5">Class 1-5</option>
              <option value="Class 6-8">Class 6-8</option>
              <option value="Class 9-10">Class 9-10</option>
            </select>
            
            <select 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              style={{ flex: '1', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '200px' }}
            >
              <option value="">All Subjects</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="English">English</option>
              <option value="Social Studies">Social Studies</option>
              <option value="Hindi">Hindi</option>
            </select>
            
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Search</button>
          </form>
        </div>

        {/* Results */}
        <div>
          <h3 style={{ marginBottom: '1.5rem', color: '#334155' }}>
            {loading ? 'Searching...' : `Found ${tutors.length} tutor${tutors.length !== 1 ? 's' : ''}`}
          </h3>

          <div className="tutors-grid">
            {tutors.map(tutor => (
              <div key={tutor.id} className="tutor-card">
                <div className="tutor-image">
                  <img src={tutorPlaceholder} alt={tutor.name} />
                </div>
                <div className="tutor-info">
                  <div className="tutor-header">
                    <h3>{tutor.name}</h3>
                    <div className="rating"><i className="ri-star-fill"></i> New</div>
                  </div>
                  <p className="tutor-subject">{tutor.subjects?.join(', ') || 'No subjects listed'}</p>
                  <p className="tutor-classes">{tutor.classLevels?.join(', ') || 'No classes listed'}</p>
                  <p style={{ marginTop: '0.5rem', color: '#64748B', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {tutor.bio || 'This tutor has not added a bio yet.'}
                  </p>
                  <div className="tutor-footer" style={{ marginTop: '1rem' }}>
                    <span className="experience" style={{ fontWeight: 'bold', color: '#0f172a' }}>
                      ₹{tutor.hourlyRate || 0} / hr
                    </span>
                    <button className="btn-outline">Book Demo</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && tutors.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '1rem' }}>
              <i className="ri-search-line" style={{ fontSize: '3rem', color: '#cbd5e1' }}></i>
              <h3 style={{ marginTop: '1rem', color: '#475569' }}>No tutors found</h3>
              <p style={{ color: '#64748B', marginTop: '0.5rem' }}>Try adjusting your search filters to find more tutors.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Search;
