import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiGrid, FiList, FiActivity, FiUsers, FiSettings, FiUser, FiGithub, FiLogOut } from 'react-icons/fi';

export default function MainLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const LinkItem = ({ to, icon: Icon, children }) => (
    <NavLink to={to} className={({ isActive }) => 'nav-link text-light d-flex align-items-center gap-2 ' + (isActive ? 'active fw-semibold' : '')}>
      {Icon ? <Icon className="opacity-75" /> : null}
      <span className="text-truncate">{children}</span>
    </NavLink>
  );

  return (
    <div className="container-fluid">
      <div className="row flex-nowrap min-vh-100">
        {/* Sidebar */}
        <div className="col-auto col-md-3 col-lg-2 px-0 bg-dark border-end border-secondary">
          <div className="px-3 py-3 border-bottom border-secondary d-flex align-items-center">
            <img src="/assets/single-logo-black-bg-white-logo.png" alt="Clicklink" style={{ height: 28, width: 'auto', borderRadius: 4 }} />
            {/* something greeting like howdy but not use word howdy */}
            <span className="ms-2 fw-semibold text-light">Welcome back!</span>
          </div>
          <nav className="nav nav-pills flex-column px-2 py-2">
            <LinkItem to="/dashboard" icon={FiGrid}>Dashboard</LinkItem>
            <LinkItem to="/tasks" icon={FiList}>Tasks</LinkItem>
            <LinkItem to="/activity" icon={FiActivity}>Activity</LinkItem>
            <LinkItem to="/members" icon={FiUsers}>Members</LinkItem>
            <LinkItem to="/settings" icon={FiSettings}>Settings</LinkItem>
            <LinkItem to="/me" icon={FiUser}>Profile</LinkItem>
            <hr className="border-secondary" />
            <LinkItem to="/github-stats" icon={FiGithub}>GitHub Stats</LinkItem>
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
                <button className="btn btn-outline-light btn-sm d-flex align-items-center gap-1" onClick={() => { onLogout?.(); navigate('/'); }}>
                  <FiLogOut />
                  <span>Logout</span>
                </button>
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
