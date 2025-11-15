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

  return (
    <div>
      <h1 style={{ marginBottom: '20px', color: '#1a1a2e' }}>Riders</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: '600' }}>Filter by status:</label>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
        >
          <option value="all">All</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="onride">On Ride</option>
        </select>
      </div>

      <div className="table-container">
        <h2>Riders ({riders.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Rider ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Points Balance</th>
              <th>Completed Rides</th>
              <th>Accepted Rides</th>
              <th>Rejected Offers</th>
              <th>Last Seen</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {riders.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No riders found
                </td>
              </tr>
            ) : (
              riders.map(rider => (
                <tr key={rider.riderId}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {rider.riderId}
                  </td>
                  <td><strong>{rider.name}</strong></td>
                  <td>{rider.phone}</td>
                  <td>
                    <span className={`status-badge status-${rider.status}`}>
                      {rider.status}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#4ecca3' }}>{rider.pointsBalance}</strong>
                  </td>
                  <td>{rider.completedRides}</td>
                  <td>{rider.acceptedRides}</td>
                  <td>{rider.rejectedOffers}</td>
                  <td>
                    {format(new Date(rider.lastSeen), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td style={{ fontSize: '11px', color: '#666' }}>
                    {rider.location?.coordinates[1].toFixed(4)}, {rider.location?.coordinates[0].toFixed(4)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Riders;
