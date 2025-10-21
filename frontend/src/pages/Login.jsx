import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, isTokenExpired, removeToken } from '../utils/auth';

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
    window.location.href = '/auth/clickup';
  };

  return (
  <div className="min-vh-100 w-100 d-flex align-items-center bg-dark">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-11 col-sm-9 col-md-6 col-lg-5 col-xl-4">
            <div className="card shadow-sm">
              <div className="card-body p-4 text-center">
                <h1 className="h3 mb-2">Clicklink</h1>
                <p className="text-muted mb-4">Manage Design, Dev, and GitHub tasks in one place.</p>
                <button className="btn btn-primary btn-lg w-100" onClick={handleLogin}>
                  Login with ClickUp
                </button>
                <div className="mt-3 small text-muted">
                  You will be redirected to ClickUp to authorize access.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
