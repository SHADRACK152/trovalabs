import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader, CheckCircle, XCircle } from 'lucide-react';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = React.useState('processing');

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setTimeout(() => {
        navigate('/login?error=oauth_failed');
      }, 2000);
      return;
    }

    if (token) {
      // Store token and redirect to chat
      localStorage.setItem('token', token);
      
      // Fetch user info
      fetch('http://localhost:8000/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(user => {
          localStorage.setItem('user', JSON.stringify(user));
          setStatus('success');
          setTimeout(() => {
            navigate('/chat');
          }, 1000);
        })
        .catch(err => {
          console.error('Error fetching user:', err);
          setStatus('error');
          setTimeout(() => {
            navigate('/login?error=oauth_failed');
          }, 2000);
        });
    } else {
      setStatus('error');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-8">
      <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-700/50 p-12 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader className="w-16 h-16 mx-auto text-blue-400 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Signing you in...</h2>
            <p className="text-slate-400">Please wait while we complete your sign-in</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
            <p className="text-slate-400">Redirecting to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
            <p className="text-slate-400">Redirecting back to login...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
