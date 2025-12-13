import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import ProfileSetup from './components/ProfileSetup';
import TextChat from './components/ChatPage';
import VoiceConversation from './components/VoiceConversation';
import AudiobookPage from './components/AudiobookPage';
import SeriesPage from './components/SeriesPage';
import CollectionsPage from './components/CollectionsPage';
import AuthorsPage from './components/AuthorsPage';
import NarratorsPage from './components/NarratorsPage';
import PreferencesPage from './components/PreferencesPage';
import OAuthCallback from './components/OAuthCallback';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        
        {/* Protected Routes */}
        <Route 
          path="/profile-setup" 
          element={
            <ProtectedRoute>
              <ProfileSetup />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <TextChat />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/voice" 
          element={
            <ProtectedRoute>
              <VoiceConversation />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/audiobooks" 
          element={
            <ProtectedRoute>
              <AudiobookPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/audiobooks/series"
          element={
            <ProtectedRoute>
              <SeriesPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/audiobooks/collections"
          element={
            <ProtectedRoute>
              <CollectionsPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/audiobooks/authors"
          element={
            <ProtectedRoute>
              <AuthorsPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/audiobooks/narrators"
          element={
            <ProtectedRoute>
              <NarratorsPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/audiobooks/preferences"
          element={
            <ProtectedRoute>
              <PreferencesPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
