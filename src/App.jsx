import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import SetupProfile from './pages/SetupProfile';
import Dashboard from './pages/Dashboard';
import MyProfile from './pages/MyProfile';
import EditProfile from './pages/EditProfile';
import Search from './pages/Search';
import BookDemo from './pages/BookDemo';
import TutorProfile from './pages/TutorProfile';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './context/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import './App.css';

// Requires login — redirects guests to /login
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Requires admin role — redirects non-admins to home
function AdminRoute({ children }) {
  const { currentUser, userData } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (userData && userData.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

const P = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

function App() {
  const basename = import.meta.env.BASE_URL || '/';

  return (
    <AuthProvider>
      <Router basename={basename}>
        <ScrollToTop />
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/setup-profile" element={P(<SetupProfile />)} />
          <Route path="/search" element={P(<Search />)} />
          <Route path="/tutor/:tutorId" element={P(<TutorProfile />)} />
          <Route path="/book/:tutorId" element={P(<BookDemo />)} />
          <Route path="/dashboard" element={P(<Dashboard />)} />
          <Route path="/profile" element={P(<MyProfile />)} />
          <Route path="/edit-profile" element={P(<EditProfile />)} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
        <BottomNav />
      </Router>
    </AuthProvider>
  );
}

export default App;
