import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  return (
  <nav className="navbar navbar-expand-lg navbar-light bg-light fixed-top shadow-sm">
      <div className="container">
  <Link className="navbar-brand" to="/dashboard">Clicklink</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent" aria-controls="navContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item"><Link className="nav-link" to="/dashboard">Dashboard</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/profile">Profile</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/settings">Settings</Link></li>
          </ul>

          <div className="d-flex align-items-center">
            {user ? (
              <>
                <div className="me-3">{user.username}</div>
                <button className="btn btn-outline-danger btn-sm" onClick={onLogout}>Logout</button>
              </>
            ) : (
              <Link className="btn btn-primary btn-sm" to="/">Login</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
