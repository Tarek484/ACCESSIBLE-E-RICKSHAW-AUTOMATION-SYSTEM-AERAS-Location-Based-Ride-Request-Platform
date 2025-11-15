import React from 'react';
import { NavLink } from 'react-router-dom';

function Layout({ children, onLogout }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>🚗 E-Rickshaw</h1>
        <nav>
          <NavLink to="/" end>📊 Dashboard</NavLink>
          <NavLink to="/requests">📝 Requests</NavLink>
          <NavLink to="/riders">👥 Riders</NavLink>
          <NavLink to="/map">🗺️ Map</NavLink>
          <NavLink to="/points">⭐ Points</NavLink>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
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
