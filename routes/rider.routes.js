const express = require('express');
const router = express.Router();
const Rider = require('../models/Rider');
const RideRequest = require('../models/RideRequest');
const Booth = require('../models/Booth');
const { 
  acceptOffer, 
  rejectOffer, 
  markPickup, 
  markDropoff 
} = require('../controllers/requestsController');

// Middleware to set rider status to inride after accepting
const acceptOfferWrapper = async (req, res) => {
  await acceptOffer(req, res);
  
  // Update rider status to inride if accept was successful
  if (res.statusCode === 200) {
    try {
      await Rider.findOneAndUpdate(
        { riderId: req.body.riderId },
        { $set: { status: 'inride' } }
      );
    } catch (err) {
      console.error('Failed to update rider status:', err);
    }
  }
};

// POST /api/rider/heartbeat - Update rider location and status
router.post('/heartbeat', async (req, res) => {
  try {
    const { riderId, latitude, longitude, status, socketId } = req.body;

    if (!riderId || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'riderId, latitude, and longitude are required' 
      });
    }

    // Check if rider exists first
    let rider = await Rider.findOne({ riderId });
    
    if (!rider) {
      return res.status(404).json({ 
        error: `Rider ${riderId} not found in database. Please run 'npm run seed' first.` 
      });
    }

    // Check if rider has an active ride first
    const activeRide = await RideRequest.findOne({
      riderId,
      status: { $in: ['accepted', 'picked_up'] }
    });

    // Auto-set status to inride if active ride exists
    const riderStatus = activeRide ? 'inride' : (status || 'online');

    rider = await Rider.findOneAndUpdate(
      { riderId },
      {
        $set: {
          'location.type': 'Point',
          'location.coordinates': [parseFloat(longitude), parseFloat(latitude)],
          status: riderStatus,
          ...(socketId && { socketId }),
          lastSeen: new Date()
        }
      },
      { new: true }
    );

    let rideDetails = null;
    if (activeRide) {
      const sourceBooth = await Booth.findOne({ boothId: activeRide.boothId });
      const destBooth = await Booth.findOne({ boothId: activeRide.destinationId });
      
      rideDetails = {
        requestId: activeRide.requestId,
        status: activeRide.status,
        pickupLocation: activeRide.sourceLocation,
        destinationLocation: activeRide.destinationLocation,
        boothName: sourceBooth?.name,
        destinationName: destBooth?.name
      };
    }

    res.json({
      success: true,
      rider: {
        riderId: rider.riderId,
        status: rider.status,
        location: {
          latitude: rider.latitude,
          longitude: rider.longitude
        }
      },
      activeRide: rideDetails
    });

  } catch (error) {
    console.error('Error updating rider heartbeat:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rider/accept - Accept ride offer
router.post('/accept', acceptOfferWrapper);

// POST /api/rider/reject - Reject ride offer
router.post('/reject', rejectOffer);

// POST /api/rider/pickup - Mark passenger picked up
router.post('/pickup', markPickup);

// POST /api/rider/dropoff - Mark ride completed
router.post('/dropoff', markDropoff);

// GET /api/rider/:riderId - Get rider details
router.get('/:riderId', async (req, res) => {
  try {
    const rider = await Rider.findOne({ riderId: req.params.riderId });
    
    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    res.json(rider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rider/:riderId/active-ride - Check if rider has an active ride
router.get('/:riderId/active-ride', async (req, res) => {
  try {
    const { riderId } = req.params;
    
    // Find active ride for this rider
    const activeRide = await RideRequest.findOne({
      riderId,
      status: { $in: ['accepted', 'picked_up'] }
    });

    if (!activeRide) {
      return res.json({ 
        hasActiveRide: false,
        message: 'No active ride found'
      });
    }

    // Get booth details
    const sourceBooth = await Booth.findOne({ boothId: activeRide.boothId });
    const destBooth = await Booth.findOne({ boothId: activeRide.destinationId });

    res.json({
      hasActiveRide: true,
      ride: {
        requestId: activeRide.requestId,
        status: activeRide.status,
        boothId: activeRide.boothId,
        destinationId: activeRide.destinationId,
        boothName: sourceBooth?.name || 'Unknown',
        destinationName: destBooth?.name || 'Unknown',
        pickupLocation: activeRide.sourceLocation,
        destinationLocation: activeRide.destinationLocation,
        acceptedAt: activeRide.updatedAt
      }
    });

  } catch (error) {
    console.error('Error checking active ride:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
