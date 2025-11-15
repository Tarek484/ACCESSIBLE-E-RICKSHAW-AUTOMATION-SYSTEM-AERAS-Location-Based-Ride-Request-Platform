import React from 'react';
import { NavLink } from 'react-router-dom';

function Layout({ children, onLogout }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <h1>E-Rickshaw Admin</h1>
          <p>Accessible Ride Management</p>
        </div>
        <nav>
          <NavLink to="/" end>📊 Dashboard</NavLink>
          <NavLink to="/requests">📝 Requests</NavLink>
          <NavLink to="/riders">👥 Riders</NavLink>
          <NavLink to="/map">🗺️ Live Map</NavLink>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button className="btn-danger" onClick={onLogout} style={{ width: '100%' }}>
            🚪 Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
