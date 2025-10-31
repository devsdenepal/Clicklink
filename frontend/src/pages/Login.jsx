import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getToken, isTokenExpired, removeToken, BACKEND_URL } from '../utils/auth';
import { SiClickup } from 'react-icons/si';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (token) {
      if (!isTokenExpired(token)) {
        navigate('/dashboard', { replace: true });
        return;
      }
      // Clean up expired tokens
      removeToken();
    }
  }, [navigate]);

  const handleLogin = () => {
    // Kick off ClickUp OAuth via backend
    window.location.href = `${BACKEND_URL}/auth/clickup`;
  };

  return (
  <div className="min-vh-100 w-100 d-flex align-items-center bg-dark">
      <div className="container">
        <div className="row justify-content-center">
                  <div className="col-11 col-sm-9 col-md-6 col-lg-5 col-xl-4">
                    <motion.div className="card shadow-sm"
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}>
          <div className="card-body p-4 text-center">
        <img src="/assets/clicklink.png" alt="Clicklink" className="img-fluid mb-3" style={{ maxWidth: 200, height: 'auto' }} />
                <p className="text-muted mb-4">Manage Design, Dev, and GitHub tasks in one place.</p>
                <button className="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center gap-2" onClick={handleLogin}>
                  <SiClickup size={22} />
                  <span>Login with ClickUp</span>
                </button>
                <div className="mt-3 small text-muted">
                  You will be redirected to ClickUp to authorize access.
                </div>
              </div>
                    </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
