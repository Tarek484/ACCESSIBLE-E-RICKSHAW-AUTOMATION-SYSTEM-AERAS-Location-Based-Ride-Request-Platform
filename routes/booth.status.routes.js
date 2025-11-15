const express = require('express');
const router = express.Router();
const RideRequest = require('../models/RideRequest');

// GET /api/booth/:boothId/status - Get current ride status for IoT device LED control
router.get('/:boothId/status', async (req, res) => {
  try {
    const { boothId } = req.params;

    // Find the most recent active request for this booth
    const request = await RideRequest.findOne({
      boothId,
      status: { $in: ['pending', 'offering', 'accepted', 'picked_up'] }
    }).sort({ createdAt: -1 });

    if (!request) {
      // No active request
      return res.json({
        success: true,
        hasActiveRequest: false,
        ledColor: null,
        message: 'No active request'
      });
    }

    // Determine LED color based on status
    let ledColor;
    let message;

    switch (request.status) {
      case 'pending':
      case 'offering':
        ledColor = 'yellow';
        message = 'Searching for rider...';
        break;
      case 'accepted':
      case 'picked_up':
        ledColor = 'green';
        message = 'Rider accepted - On the way';
        break;
      default:
        ledColor = null;
        message = 'Unknown status';
    }

    res.json({
      success: true,
      hasActiveRequest: true,
      requestId: request.requestId,
      status: request.status,
      ledColor,
      message,
      createdAt: request.createdAt
    });

  } catch (error) {
    console.error('Error getting booth status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/booth/request/:requestId/status - Get specific request status
router.get('/request/:requestId/status', async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await RideRequest.findOne({ requestId });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Determine LED color based on status
    let ledColor;
    let message;

    switch (request.status) {
      case 'pending':
      case 'offering':
        ledColor = 'yellow';
        message = 'Searching for rider...';
        break;
      case 'accepted':
      case 'picked_up':
        ledColor = 'green';
        message = 'Rider accepted - On the way';
        break;
      case 'completed':
        ledColor = 'green';
        message = 'Ride completed successfully';
        break;
      case 'cancelled':
        ledColor = 'red';
        message = 'Request cancelled - No riders available';
        break;
      default:
        ledColor = null;
        message = 'Unknown status';
    }

    res.json({
      success: true,
      requestId: request.requestId,
      status: request.status,
      ledColor,
      message,
      boothId: request.boothId,
      destinationId: request.destinationId,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
      cancelledAt: request.cancelledAt
    });

  } catch (error) {
    console.error('Error getting request status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
