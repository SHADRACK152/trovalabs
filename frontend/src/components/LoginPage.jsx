import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, Loader, Sparkles, Zap, Github } from 'lucide-react';
import { login } from '../services/api';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [oauthProvider, setOauthProvider] = useState('');
  const [oauthInstructions, setOauthInstructions] = useState(null);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      navigate('/chat', { replace: true });
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await login(formData.email, formData.password);
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthClick = async (provider) => {
    try {
      // Try calling backend endpoint first with redirect detection
      const backendUrl = `http://localhost:8000/auth/${provider}`;
      let res;
      try {
        // Try a manual redirect fetch so we can detect a JSON setup response
        res = await fetch(backendUrl, { method: 'GET', redirect: 'manual' });
      } catch (err) {
        // If fetch fails due to CORS, fall back to direct navigation
        console.warn('Fetch to OAuth endpoint failed (CORS or network), falling back to direct navigate', err);
        window.location.href = backendUrl;
        return;
      }

      // If we got a JSON response (setup instructions), parse and show modal
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 200 && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.status === 'setup_required') {
          setOauthProvider(provider);
          setOauthInstructions(data);
          setShowOAuthModal(true);
          return;
        }
        if (data.auth_url) {
          window.location.href = data.auth_url;
          return;
        }
      }

      // Otherwise, if we received a redirect (3xx), attempt to use the Location header
      if (res.status >= 300 && res.status < 400) {
        const redirectTo = res.headers.get('Location') || res.headers.get('location');
        if (redirectTo) {
          window.location.href = redirectTo;
          return;
        }
      }

      // Fallback: if not JSON and no redirect header, just navigate to the backend endpoint
      window.location.href = backendUrl;
    } catch (error) {
      console.error('OAuth error:', error);
      setError('Failed to initiate OAuth login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-8 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main Container - Split Layout */}
      <div className="relative w-full max-w-6xl z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Logo and Brand */}
        <div className="flex flex-col items-center lg:items-start justify-center space-y-6 text-center lg:text-left px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 shadow-2xl shadow-blue-500/50 animate-float">
              <Sparkles className="w-12 h-12 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">
                Lumino AI
              </h1>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white">
              Welcome Back
            </h2>
            <p className="text-xl text-blue-300/80 leading-relaxed">
              Sign in to continue your intelligent conversations and access your personalized AI assistant.
            </p>
            
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-slate-300">Resume your AI conversations</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-slate-300">Access your conversation history</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-slate-300">Secure & personalized experience</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 transform transition-all hover:shadow-blue-500/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-white mb-2">Sign In</h3>
              <p className="text-slate-400">Enter your credentials to continue</p>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center gap-2 animate-shake">
                <Zap className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2 group">
              <label className="block text-sm font-semibold text-slate-300 group-focus-within:text-blue-400 transition-colors">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-slate-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2 group">
              <label className="block text-sm font-semibold text-slate-300 group-focus-within:text-blue-400 transition-colors">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-slate-500"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-slate-300 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer transition-all"
                />
                <span className="ml-2 group-hover:text-white transition-colors">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* OAuth Section - Outside Form */}
          <div className="mt-6">
            {/* OAuth Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-900/60 text-slate-400 font-medium">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleOAuthClick('google')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-600 hover:border-slate-500 rounded-xl transition-all transform hover:scale-105 active:scale-95 group"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-white font-medium">Google</span>
              </button>

              {/* GitHub */}
              <button
                type="button"
                onClick={() => handleOAuthClick('github')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-600 hover:border-slate-500 rounded-xl transition-all transform hover:scale-105 active:scale-95 group"
              >
                <Github className="w-5 h-5 text-white" />
                <span className="text-white font-medium">GitHub</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-900/60 text-slate-400 font-medium">Don't have an account?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            to="/signup"
            className="block w-full text-center py-4 px-6 border-2 border-slate-600 hover:border-blue-500 hover:bg-slate-800/50 text-slate-300 hover:text-white rounded-xl transition-all transform hover:scale-[1.02] font-semibold active:scale-95"
          >
            Create New Account
          </Link>
        </div>

        {/* Back to Home - Below both sides */}
      </div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <Link 
          to="/" 
          className="text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-2 font-medium group"
        >
          <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
          <span>Back to Home</span>
        </Link>
      </div>

      {/* OAuth Setup Modal */}
      {showOAuthModal && oauthInstructions && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white capitalize">
                    {oauthProvider} OAuth Setup
                  </h3>
                  <p className="text-slate-400 text-sm">Configuration Required</p>
                </div>
              </div>
              <button
                onClick={() => setShowOAuthModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Demo Section */}
            {oauthInstructions.quick_demo && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="text-green-400 font-semibold mb-2">Quick Demo Available!</h4>
                    <p className="text-slate-300 text-sm mb-3">{oauthInstructions.quick_demo.message}</p>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">Demo Account:</p>
                      <p className="text-white font-mono text-sm">
                        📧 {oauthInstructions.quick_demo.demo_account.email}
                      </p>
                      <p className="text-white font-mono text-sm">
                        🔑 {oauthInstructions.quick_demo.demo_account.password}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFormData({
                          email: oauthInstructions.quick_demo.demo_account.email,
                          password: oauthInstructions.quick_demo.demo_account.password
                        });
                        setShowOAuthModal(false);
                      }}
                      className="mt-3 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                      Use Demo Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Setup Instructions */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Setup Instructions:</h4>
              <div className="space-y-3">
                {oauthInstructions.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 text-sm font-bold">{index + 1}</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alternative */}
            <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <p className="text-purple-300 text-sm">
                <strong>Alternative:</strong> {oauthInstructions.alternative}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowOAuthModal(false)}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-xl transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowOAuthModal(false);
                  navigate('/signup');
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl transition-colors font-medium"
              >
                Create Account Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
