import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { initSocket } from '../socket';
import { format } from 'date-fns';

function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadRequests();
    
    // Initialize socket for live updates
    const socket = initSocket();
    
    socket.on('request:created', (request) => {
      setRequests(prev => [request, ...prev]);
    });
    
    socket.on('request:updated', (updatedRequest) => {
      setRequests(prev => 
        prev.map(req => 
          req.requestId === updatedRequest.requestId ? updatedRequest : req
        )
      );
    });
    
    return () => {
      socket.off('request:created');
      socket.off('request:updated');
    };
  }, [filter]);

  const loadRequests = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await adminAPI.getRequests(params);
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    
    try {
      await adminAPI.cancelRequest(requestId);
      loadRequests();
    } catch (error) {
      alert('Error cancelling request: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="requests-page">
      <div className="page-header">
        <div>
          <h1>Ride Requests</h1>
          <p className="page-subtitle">Monitor and manage all ride requests</p>
        </div>
        <div className="requests-count">
          <span className="badge badge-primary">{requests.length} Total</span>
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
            <option value="all">All Requests</option>
            <option value="pending">⏳ Pending</option>
            <option value="offering">🔍 Offering</option>
            <option value="accepted">✓ Accepted</option>
            <option value="picked_up">🚗 Picked Up</option>
            <option value="completed">✅ Completed</option>
            <option value="cancelled">❌ Cancelled</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>From → To</th>
              <th>Status</th>
              <th>Assigned Rider</th>
              <th>Offer Attempts</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No requests found
                </td>
              </tr>
            ) : (
              requests.map(request => (
                <tr key={request.requestId}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {request.requestId}
                  </td>
                  <td>
                    <div className="route-info">
                      <strong>{request.boothName || request.boothId}</strong>
                      <span className="route-arrow">→</span>
                      <strong>{request.destinationName || request.destinationId}</strong>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${request.status}`}>
                      {request.status}
                    </span>
                  </td>
                  <td>{request.assignedRider || '—'}</td>
                  <td>
                    {request.offerAttempts.length > 0 ? (
                      <details>
                        <summary style={{ cursor: 'pointer' }}>
                          {request.offerAttempts.length} attempt(s)
                        </summary>
                        <div className="timeline" style={{ marginTop: '10px' }}>
                          {request.offerAttempts.map((attempt, idx) => (
                            <div key={idx} className="timeline-item">
                              <div className="timeline-content">
                                <strong>{attempt.riderId}</strong>
                                <br />
                                {attempt.response ? (
                                  <span className={`status-badge status-${attempt.response}`}>
                                    {attempt.response}
                                  </span>
                                ) : (
                                  <span className="status-badge" style={{ background: '#e9ecef', color: '#666' }}>
                                    waiting
                                  </span>
                                )}
                                <br />
                                <small style={{ color: '#666' }}>
                                  {format(new Date(attempt.offeredAt), 'HH:mm:ss')}
                                </small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{format(new Date(request.createdAt), 'MMM dd, HH:mm')}</td>
                  <td>
                    {(request.status === 'pending' || request.status === 'offering') && (
                      <button 
                        className="btn-danger"
                        onClick={() => handleCancel(request.requestId)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    )}
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

export default Requests;
