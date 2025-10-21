import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function MainLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const LinkItem = ({ to, children }) => (
    <NavLink to={to} className={({ isActive }) => 'nav-link text-light ' + (isActive ? 'active fw-semibold' : '')}>
      {children}
    </NavLink>
  );

  return (
    <div className="container-fluid">
      <div className="row flex-nowrap min-vh-100">
        {/* Sidebar */}
        <div className="col-auto col-md-3 col-lg-2 px-0 bg-dark border-end border-secondary">
          <div className="px-3 py-3 border-bottom border-secondary fw-bold text-light">Clicklink</div>
          <nav className="nav nav-pills flex-column px-2 py-2">
            <LinkItem to="/dashboard">Dashboard</LinkItem>
            <LinkItem to="/tasks">Tasks</LinkItem>
            <LinkItem to="/members">Members</LinkItem>
            <LinkItem to="/settings">Settings</LinkItem>
            <LinkItem to="/me">Profile</LinkItem>
          </nav>
        </div>

        {/* Main column */}
        <div className="col py-0 d-flex flex-column">
          {/* Top navbar */}
          <div className="navbar sticky-top navbar-dark bg-dark border-bottom border-secondary">
            <div className="container-fluid d-flex justify-content-between">
              <div />
              <div className="d-flex align-items-center gap-2">
                {user && <span className="small text-secondary">{user.username || user.email}</span>}
                <button className="btn btn-outline-light btn-sm" onClick={() => { onLogout?.(); navigate('/'); }}>Logout</button>
              </div>
            </div>
          </div>

          {/* Routed content */}
          <div className="container-fluid py-3">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
