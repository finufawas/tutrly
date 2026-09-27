import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
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

function App() {
  const basename = import.meta.env.BASE_URL || '/';

  return (
    <AuthProvider>
      <Router basename={basename}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          {/* Setup profile — protected, for first-time users */}
          <Route 
            path="/setup-profile" 
            element={
              <ProtectedRoute>
                <SetupProfile />
              </ProtectedRoute>
            } 
          />

          {/* These pages require login (guests are redirected to /login) */}
          <Route 
            path="/search" 
            element={
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tutor/:tutorId" 
            element={
              <ProtectedRoute>
                <TutorProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/book/:tutorId" 
            element={
              <ProtectedRoute>
                <BookDemo />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <MyProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/edit-profile" 
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;
