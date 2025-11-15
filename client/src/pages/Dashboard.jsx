import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { initSocket } from '../socket';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    
    // Initialize socket for live updates
    const socket = initSocket();
    
    socket.on('request:created', () => {
      loadDashboard();
    });
    
    socket.on('request:updated', () => {
      loadDashboard();
    });
    
    socket.on('rider:status:changed', () => {
      loadDashboard();
    });
    
    // Refresh every 10 seconds
    const interval = setInterval(loadDashboard, 10000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await adminAPI.getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return <div>Error loading dashboard</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px', color: '#1a1a2e' }}>Dashboard</h1>
      
      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Total Riders</h3>
          <div className="value">{stats.riders.total}</div>
        </div>
        
        <div className="stat-card online">
          <h3>Online Riders</h3>
          <div className="value">{stats.riders.online}</div>
        </div>
        
        <div className="stat-card">
          <h3>On Ride</h3>
          <div className="value">{stats.riders.onRide}</div>
        </div>
        
        <div className="stat-card">
          <h3>Offline Riders</h3>
          <div className="value">{stats.riders.offline}</div>
        </div>
        
        <div className="stat-card">
          <h3>Total Requests</h3>
          <div className="value">{stats.requests.total}</div>
        </div>
        
        <div className="stat-card pending">
          <h3>Pending Requests</h3>
          <div className="value">{stats.requests.pending}</div>
        </div>
        
        <div className="stat-card">
          <h3>Completed Rides</h3>
          <div className="value">{stats.requests.completed}</div>
        </div>
        
        <div className="stat-card">
          <h3>Points Review</h3>
          <div className="value">{stats.points.pendingReview}</div>
        </div>
      </div>

      <div className="table-container">
        <h2>Quick Stats</h2>
        <p style={{ color: '#666', marginTop: '10px' }}>
          System is operational. {stats.riders.online} riders are currently online and available.
        </p>
        <p style={{ color: '#666', marginTop: '10px' }}>
          {stats.requests.pending > 0 
            ? `${stats.requests.pending} request(s) are pending assignment.`
            : 'No pending requests at the moment.'}
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
