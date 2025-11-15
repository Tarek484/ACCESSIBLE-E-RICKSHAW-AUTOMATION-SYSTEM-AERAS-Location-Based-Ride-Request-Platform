import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { format } from 'date-fns';

function Points() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingPoints();
  }, []);

  const loadPendingPoints = async () => {
    try {
      const response = await adminAPI.getPendingPoints();
      setPending(response.data.pending);
    } catch (error) {
      console.error('Error loading pending points:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId) => {
    if (!confirm('Approve these points?')) return;
    
    try {
      await adminAPI.approvePoints(reviewId);
      loadPendingPoints();
      alert('Points approved successfully!');
    } catch (error) {
      alert('Error approving points: ' + error.message);
    }
  };

  const handleReject = async (reviewId) => {
    const notes = prompt('Rejection reason (optional):');
    if (notes === null) return; // User cancelled
    
    try {
      await adminAPI.rejectPoints(reviewId, notes);
      loadPendingPoints();
      alert('Points rejected');
    } catch (error) {
      alert('Error rejecting points: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading pending points...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '20px', color: '#1a1a2e' }}>Points Review</h1>
      
      <div className="table-container">
        <h2>Pending Reviews ({pending.length})</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Rides with distance {'>'} 100m require admin approval for points.
        </p>
        
        {pending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>✅ All caught up!</p>
            <p>No pending point reviews at the moment.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Rider ID</th>
                <th>Distance (m)</th>
                <th>Points Proposed</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(review => (
                <tr key={review._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {review.requestId}
                  </td>
                  <td><strong>{review.riderId}</strong></td>
                  <td>
                    <strong>{review.distanceMeters.toFixed(2)}</strong> m
                  </td>
                  <td>
                    <strong style={{ color: '#4ecca3', fontSize: '18px' }}>
                      {review.pointsProposed}
                    </strong>
                  </td>
                  <td>
                    {format(new Date(review.createdAt), 'MMM dd, HH:mm')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn-primary"
                        onClick={() => handleApprove(review._id)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        ✓ Approve
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={() => handleReject(review._id)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="table-container" style={{ marginTop: '30px' }}>
        <h2>Points Calculation Formula</h2>
        <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', marginTop: '15px' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '14px', marginBottom: '10px' }}>
            BasePoints = 10
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '14px', marginBottom: '10px' }}>
            DistancePoints = distanceMeters / 10
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold' }}>
            FinalPoints = BasePoints + DistancePoints
          </p>
          <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #ddd' }} />
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
            • Rides ≤ 100m: Points are auto-approved
          </p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            • Rides {'>'} 100m: Require manual admin review
          </p>
        </div>
      </div>
    </div>
  );
}

export default Points;
