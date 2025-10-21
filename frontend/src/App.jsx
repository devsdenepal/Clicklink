import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskDetail from './pages/TaskDetail';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import GitHubStats from './pages/GitHubStats';
import { api, getToken, setToken, removeToken } from './utils/auth';
import MainLayout from './layouts/MainLayout';

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
    // Fallback: support token in hash query too
    let tokenFromHash = null;
    if (!token && location.hash && location.hash.includes('token=')) {
      const hp = new URLSearchParams(location.hash.replace(/^#/, ''));
      tokenFromHash = hp.get('token');
    }
    const tkn = token || tokenFromHash;
    if (tkn) {
      setToken(tkn);
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
      console.warn('Auth check failed:', err.message, err.code);
      // If token is GitHub-only, /auth/user will be TOKEN_INVALID_FORMAT; keep token for GitHub pages
      if (err && (err.code === 'TOKEN_INVALID_FORMAT')) {
        setUser(null);
        return false;
      }
      removeToken();
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

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading…</span>
      </div>
    </div>
  );

  return (
    <div>
      <main>
        <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Login />} />
          {/* Allow GitHub Stats directly when not logged-in (GitHub-only token). */}
          {!user && (<Route path="/github-stats" element={<GitHubStats />} />)}
          <Route element={user ? <MainLayout user={user} onLogout={handleLogout} /> : <Login />}>
            <Route path="/dashboard" element={<Dashboard user={user} onLogout={handleLogout} />} />
            <Route path="/task/:id" element={<TaskDetail user={user} checkAuthStatus={checkAuthStatus} />} />
            <Route path="/me" element={<Profile user={user} />} />
            <Route path="/settings" element={<Settings />} />
            {/* Tasks list page (original detailed view) */}
            <Route path="/tasks" element={<Tasks user={user} />} />
            <Route path="/members" element={<Profile user={user} />} />
            {/* When logged-in, render GitHub Stats inside the layout (with sidebar) */}
            <Route path="/github-stats" element={<GitHubStats />} />
          </Route>
        </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
