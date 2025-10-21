import React from 'react';

function Field({ label, value }) {
  return (
    <div className="mb-2">
      <div className="text-muted small">{label}</div>
      <div className="text-body">{value ?? '—'}</div>
    </div>
  );
}

export default function Dashboard({ user, onLogout }) {
  return (
    <div className="container-lg">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Welcome, {user.display_name || user.username || 'User'} 👋</h1>
        <div>
          <button onClick={onLogout} className="btn btn-outline-danger">Logout</button>
        </div>
      </div>

      <div className="row gy-4">
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <div className="rounded-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center mb-2" style={{ width: 84, height: 84, fontSize: 28 }}>
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="fw-bold">{user.display_name || user.username}</div>
              <div className="text-muted small">{user.email}</div>
            </div>

            <div className="card-body border-top">
              <Field label="Username" value={user.username} />
              <Field label="Email" value={user.email} />
              <Field label="User ID" value={user.id} />
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>Dashboard</h5>
              <p className="text-muted">This is a simple welcome dashboard. You can extend this area with projects, tasks, and ClickUp data pulled via the API.</p>

              <div className="mt-3 p-3 bg-light rounded">
                <h6>Raw user data</h6>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(user, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
