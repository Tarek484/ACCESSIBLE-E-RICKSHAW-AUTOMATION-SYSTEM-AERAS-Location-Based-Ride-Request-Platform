import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { initSocket } from '../socket';

function Dashboard() {
  // Hardcoded demo stats with 1 online rider (Saeed Ahmed)
  const demoStats = {
    riders: {
      total: 3,
      online: 1,
      offline: 2,
      onRide: 0
    },
    requests: {
      total: 0,
      pending: 0,
      offering: 0,
      accepted: 0,
      completed: 0,
      cancelled: 0
    },
    points: {
      pendingReview: 0
    }
  };

  const [stats, setStats] = useState(demoStats);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // loadDashboard(); // Commented out - using hardcoded demo data
    
    // Initialize socket for live updates
    const socket = initSocket();
    
    socket.on('request:created', () => {
      loadDashboard();
    });
    
    socket.on('request:updated', () => {
      loadDashboard();
    });
    
    socket.on('rider:status:changed', () => {
      // loadDashboard(); // Disabled for demo
    });
    
    // Refresh every 10 seconds - disabled for demo
    // const interval = setInterval(loadDashboard, 10000);
    
    return () => {
      // clearInterval(interval);
    };
  }, []);

  const loadDashboard = async () => {
    // Disabled - using hardcoded demo data
    // try {
    //   const response = await adminAPI.getDashboard();
    //   setStats(response.data);
    // } catch (error) {
    //   console.error('Error loading dashboard:', error);
    // } finally {
    //   setLoading(false);
    // }
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
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p className="page-subtitle">Real-time monitoring of E-Rickshaw system</p>
        </div>
        <div className="status-indicator">
          <span className="status-dot active"></span>
          <span>System Active</span>
        </div>
      </div>
      
      {/* Primary Metrics */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">🚗</div>
          <div className="metric-content">
            <h3>Active Rides</h3>
            <div className="metric-value">{stats.riders.onRide}</div>
            <div className="metric-label">Currently in progress</div>
          </div>
        </div>
        
        <div className="metric-card success">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>Online Riders</h3>
            <div className="metric-value">{stats.riders.online}</div>
            <div className="metric-label">Available for rides</div>
          </div>
        </div>
        
        <div className="metric-card warning">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h3>Pending Requests</h3>
            <div className="metric-value">{stats.requests.pending}</div>
            <div className="metric-label">Awaiting assignment</div>
          </div>
        </div>
        
        <div className="metric-card info">
          <div className="metric-icon">✓</div>
          <div className="metric-content">
            <h3>Completed Today</h3>
            <div className="metric-value">{stats.requests.completed}</div>
            <div className="metric-label">Successfully finished</div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Total Riders</span>
          <span className="stat-value">{stats.riders.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Offline Riders</span>
          <span className="stat-value">{stats.riders.offline}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Requests</span>
          <span className="stat-value">{stats.requests.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Points Reviews</span>
          <span className="stat-value">{stats.points.pendingReview}</span>
        </div>
      </div>

      {/* System Status */}
      <div className="info-cards-grid">
        <div className="info-card">
          <div className="info-card-header">
            <h3>System Health</h3>
            <span className="badge badge-success">Operational</span>
          </div>
          <div className="info-card-body">
            <div className="info-item">
              <span className="info-label">Active Riders</span>
              <span className="info-value">{stats.riders.online + stats.riders.onRide}</span>
            </div>
            <div className="info-item">
              <span className="info-label">System Uptime</span>
              <span className="info-value">99.9%</span>
            </div>
            <div className="info-item">
              <span className="info-label">Response Time</span>
              <span className="info-value">&lt; 2s</span>
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="info-card-body">
            <p className="info-text">
              {stats.riders.online > 0 
                ? `✓ ${stats.riders.online} riders are online and ready to serve passengers.`
                : '⚠️ No riders are currently online.'}
            </p>
            <p className="info-text">
              {stats.requests.pending > 0 
                ? `⏱ ${stats.requests.pending} request(s) are waiting for rider assignment.`
                : '✓ All requests have been assigned.'}
            </p>
            <p className="info-text">
              {stats.points.pendingReview > 0
                ? `📋 ${stats.points.pendingReview} point adjustment(s) pending review.`
                : '✓ No pending point reviews.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
