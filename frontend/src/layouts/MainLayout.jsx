import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'sidebar_collapsed';

export default function MainLayout({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === '1') setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const toggle = () => setCollapsed(c => !c);

  const LinkItem = ({ to, children }) => (
    <NavLink to={to} className={({ isActive }) => 'nav-link ' + (isActive ? 'active fw-semibold' : '')}>
      {children}
    </NavLink>
  );

  return (
    <div className="container-fluid">
      <div className="row flex-nowrap min-vh-100">
        {/* Sidebar (collapsible by hiding on toggle) */}
        <div className={`col-auto col-md-3 col-lg-2 px-0 bg-light border-end ${collapsed ? 'd-none d-md-block' : ''}`}>
          <div className="px-3 py-3 border-bottom fw-bold">Clicklink</div>
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
          <div className="navbar sticky-top navbar-light bg-white border-bottom">
            <div className="container-fluid d-flex justify-content-between">
              <button className="btn btn-outline-secondary btn-sm" onClick={toggle} aria-label="Toggle sidebar">
                {collapsed ? 'Show' : 'Hide'}
              </button>
              <div className="d-flex align-items-center gap-2">
                {user && <span className="small text-muted">{user.username || user.email}</span>}
                <button className="btn btn-outline-danger btn-sm" onClick={() => { onLogout?.(); navigate('/'); }}>Logout</button>
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
