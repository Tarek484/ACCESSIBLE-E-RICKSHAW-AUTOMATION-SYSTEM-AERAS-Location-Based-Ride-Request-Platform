import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { initSocket } from '../socket';
import { format } from 'date-fns';

function Riders() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadRiders();
    
    // Initialize socket for live updates
    const socket = initSocket();
    
    socket.on('rider:status:changed', ({ riderId, status }) => {
      setRiders(prev => 
        prev.map(rider => 
          rider.riderId === riderId ? { ...rider, status } : rider
        )
      );
    });
    
    socket.on('rider:location:updated', ({ riderId, latitude, longitude }) => {
      setRiders(prev => 
        prev.map(rider => 
          rider.riderId === riderId 
            ? { 
                ...rider, 
                location: { 
                  ...rider.location, 
                  coordinates: [longitude, latitude] 
                } 
              } 
            : rider
        )
      );
    });
    
    // Refresh every 30 seconds
    const interval = setInterval(loadRiders, 30000);
    
    return () => {
      clearInterval(interval);
      socket.off('rider:status:changed');
      socket.off('rider:location:updated');
    };
  }, [filter]);

  const loadRiders = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await adminAPI.getRiders(params);
      setRiders(response.data.riders);
    } catch (error) {
      console.error('Error loading riders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading riders...</p>
      </div>
    );
  }

  const getStatusCount = (status) => {
    return riders.filter(r => r.status === status).length;
  };

  const getPerformanceRating = (rider) => {
    const total = rider.acceptedRides + rider.rejectedOffers;
    if (total === 0) return 0;
    return ((rider.acceptedRides / total) * 100).toFixed(1);
  };

  return (
    <div className="riders-page">
      <div className="page-header">
        <div>
          <h1>Rider Management</h1>
          <p className="page-subtitle">Monitor and manage all registered riders</p>
        </div>
        <div className="riders-summary">
          <span className="badge badge-success">
            {getStatusCount('online')} Online
          </span>
          <span className="badge badge-primary">
            {getStatusCount('inride')} On Ride
          </span>
          <span className="badge badge-secondary">
            {getStatusCount('offline')} Offline
          </span>
        </div>
      </div>
      
      <div className="filters-bar">
        <div className="filter-group">
          <label>Filter by Status:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Riders ({riders.length})</option>
            <option value="online">🟢 Online ({getStatusCount('online')})</option>
            <option value="inride">🚗 On Ride ({getStatusCount('inride')})</option>
            <option value="offline">⚫ Offline ({getStatusCount('offline')})</option>
          </select>
        </div>
      </div>

      <div className="riders-grid">
        {riders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No Riders Found</h3>
            <p>No riders match the selected filter criteria.</p>
          </div>
        ) : (
          riders.map(rider => (
            <div key={rider.riderId} className="rider-card">
              <div className="rider-card-header">
                <div className="rider-avatar">
                  {rider.name.charAt(0).toUpperCase()}
                </div>
                <div className="rider-info">
                  <h3>{rider.name}</h3>
                  <p className="rider-id">{rider.riderId}</p>
                </div>
                <span className={`status-badge status-${rider.status}`}>
                  {rider.status}
                </span>
              </div>
              
              <div className="rider-card-body">
                <div className="rider-stats-grid">
                  <div className="rider-stat">
                    <div className="rider-stat-icon">⭐</div>
                    <div>
                      <div className="rider-stat-value">{rider.pointsBalance}</div>
                      <div className="rider-stat-label">Points</div>
                    </div>
                  </div>
                  
                  <div className="rider-stat">
                    <div className="rider-stat-icon">✓</div>
                    <div>
                      <div className="rider-stat-value">{rider.completedRides}</div>
                      <div className="rider-stat-label">Completed</div>
                    </div>
                  </div>
                  
                  <div className="rider-stat">
                    <div className="rider-stat-icon">📊</div>
                    <div>
                      <div className="rider-stat-value">{getPerformanceRating(rider)}%</div>
                      <div className="rider-stat-label">Accept Rate</div>
                    </div>
                  </div>
                  
                  <div className="rider-stat">
                    <div className="rider-stat-icon">📞</div>
                    <div>
                      <div className="rider-stat-value phone-number">{rider.phone}</div>
                      <div className="rider-stat-label">Contact</div>
                    </div>
                  </div>
                </div>
                
                <div className="rider-details">
                  <div className="rider-detail-item">
                    <span className="detail-label">Accepted:</span>
                    <span className="detail-value success">{rider.acceptedRides}</span>
                  </div>
                  <div className="rider-detail-item">
                    <span className="detail-label">Rejected:</span>
                    <span className="detail-value danger">{rider.rejectedOffers}</span>
                  </div>
                  <div className="rider-detail-item">
                    <span className="detail-label">Last Seen:</span>
                    <span className="detail-value">{format(new Date(rider.lastSeen), 'MMM dd, HH:mm')}</span>
                  </div>
                </div>
                
                {rider.location?.coordinates && (
                  <div className="rider-location">
                    <span className="location-icon">📍</span>
                    <span className="location-coords">
                      {rider.location.coordinates[1].toFixed(4)}, {rider.location.coordinates[0].toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Riders;
