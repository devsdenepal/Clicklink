import React from 'react';
import { Navigate } from 'react-router-dom';

export default function Profile({ user }) {
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="container">
      <div className="row">
        <div className="col-md-4">
          <div className="card mb-3">
            <div className="card-body text-center">
              <div className="rounded-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center" style={{ width: 96, height: 96, fontSize: 28 }}>
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <h4 className="mt-2">{user.display_name || user.username}</h4>
              <p className="text-muted">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h5>Profile Details</h5>
              <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
