import React from 'react';

export default function LoginScreen({ onLogin }) {
  const handleLogin = () => {
    window.location.href = '/auth/clickup';
    if (onLogin) onLogin();
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
      <div className="card shadow-sm" style={{ width: 'min(760px, 95%)' }}>
        <div className="card-body text-center">
          <h1 className="display-6">Welcome to Clicklink</h1>
          <p className="text-muted">Clicklink connects your ClickUp account to this demo dashboard. Click the button below to sign in with ClickUp.</p>
          <button className="btn btn-primary btn-lg" onClick={handleLogin}>Sign in with ClickUp</button>
        </div>
      </div>
    </div>
  );
}
