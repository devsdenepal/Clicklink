import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskDetail from './pages/TaskDetail';
import Navbar from './components/Navbar';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { api, getToken, setToken, removeToken } from './utils/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Check for token in URL (from OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      setToken(token);
      // Immediately check auth status after setting the token
      checkAuthStatus(); 
      navigate(location.pathname, { replace: true });
    }
  }, [location]);

  const checkAuthStatus = async () => {
    try {
      if (!getToken()) {
        setUser(null);
        return false;
      }

  const res = await api.get('/auth/user');
      if (!res.ok) {
        // If token is expired or revoked, remove it
        if (res.status === 401) {
          console.log('Token expired or revoked, removing...');
          removeToken();
          setUser(null);
          // Redirect to login if not already there
          if (location.pathname !== '/') {
            navigate('/');
          }
        }
        return false;
      }

      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Auth check failed:', err.message);
      removeToken(); // Remove potentially invalid token
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async function fetchUser() {
      if (!cancelled) {
        await checkAuthStatus();
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => {
    removeToken();
    setUser(null);
  };

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div>
      {location.pathname !== '/' && <Navbar user={user} onLogout={handleLogout} />}

      <main style={{width: '100vw'}}>
        {location.pathname !== '/' && (
          <div className="container">
            {error && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" />
              </div>
            )}
          </div>
        )}

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Login />} />
          <Route path="/task/:id" element={<TaskDetail user={user} checkAuthStatus={checkAuthStatus} />} />
          <Route path="/profile" element={<Profile user={user} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
