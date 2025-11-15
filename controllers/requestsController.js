const Rider = require('../models/Rider');
const RideRequest = require('../models/RideRequest');
const Booth = require('../models/Booth');
const RideLog = require('../models/RideLog');
const PointPendingReview = require('../models/PointPendingReview');
const { haversineDistance } = require('../utils/geo');
const { calculatePoints } = require('../utils/points');
const crypto = require('crypto');

let io; // Socket.io instance will be set from server.js
let wsConnections; // WebSocket connections Map will be set from server.js

function setSocketIO(socketIO) {
  io = socketIO;
}

function setWebSocketConnections(wsConns) {
  wsConnections = wsConns;
}

/**
 * Create a new ride request from booth (IoT device)
 * POST /api/booth/request
 * Body: { boothId: "SOURCE-BOOTH-01", destinationId: "DEST-01" }
 * 
 * Status Flow:
 * pending → offering → accepted → picked_up → completed
 *        ↘ (timeout) → cancelled
 */
async function createRideRequest(req, res) {
  try {
    const { boothId, destinationId } = req.body;

    // Validate input
    if (!boothId || !destinationId) {
      return res.status(400).json({ 
        error: 'boothId and destinationId are required',
        status: 'error',
        ledColor: 'red' // For IoT device
      });
    }

    // Get booth and destination details
    const sourceBooth = await Booth.findOne({ boothId });
    const destinationBooth = await Booth.findOne({ boothId: destinationId });

    if (!sourceBooth) {
      return res.status(404).json({ 
        error: 'Source booth not found',
        status: 'error',
        ledColor: 'red'
      });
    }

    if (!destinationBooth) {
      return res.status(404).json({ 
        error: 'Destination booth not found',
        status: 'error',
        ledColor: 'red'
      });
    }

    // Generate unique request ID
    const requestId = `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Create ride request with pending status
    const rideRequest = await RideRequest.create({
      requestId,
      boothId,
      destinationId,
      sourceLocation: sourceBooth.location,
      destinationLocation: destinationBooth.location,
      status: 'pending' // Initial status
    });

    console.log(`📝 New ride request created: ${requestId} from ${boothId} to ${destinationId}`);
    console.log(`🟡 Status: PENDING - Searching for riders...`);

    // Emit to admin dashboard
    if (io) {
      io.emit('request:created', rideRequest);
      // Emit to IoT device (booth) - Yellow LED
      io.emit(`booth:${boothId}:status`, {
        requestId,
        status: 'pending',
        ledColor: 'yellow',
        message: 'Searching for riders...'
      });
    }

    // Start offer assignment process (non-blocking)
    processOfferAssignment(requestId);

    // Return immediately to IoT device with yellow status
    res.status(201).json({
      success: true,
      requestId,
      status: 'pending',
      ledColor: 'yellow', // Show yellow LED on IoT device
      message: 'Request created. Searching for riders...',
      request: rideRequest
    });

  } catch (error) {
    console.error('Error creating ride request:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Process offer assignment - find candidates and offer to them iteratively
 */
async function processOfferAssignment(requestId) {
  try {
    const request = await RideRequest.findOne({ requestId });

    if (!request) {
      console.log(`⚠️  Request ${requestId} not found`);
      return;
    }
    
    if (request.status !== 'pending') {
      console.log(`⚠️  Request ${requestId} has status ${request.status}, not pending. Skipping assignment.`);
      return;
    }

    console.log(`🔍 Finding candidates for request ${requestId}`);

    // Find online riders using geospatial query (no distance limit for testing)
    const candidates = await Rider.aggregate([
      {
        $geoNear: {
          near: request.sourceLocation,
          distanceField: 'distance',
          query: { status: 'online' },
          spherical: true
          // No maxDistance limit for testing
        }
      },
      {
        $sort: {
          distance: 1,
          acceptedRides: 1,
          pointsBalance: -1
        }
      }
    ]);

    console.log(`👥 Found ${candidates.length} online riders nearby`);
    
    if (candidates.length > 0) {
      console.log(`   Booth location: [${request.sourceLocation.coordinates[0]}, ${request.sourceLocation.coordinates[1]}]`);
      candidates.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.riderId} - ${(c.distance / 1000).toFixed(2)}km away, Status: ${c.status}`);
      });
    }

    if (candidates.length === 0) {
      console.log(`❌ No online riders found for request ${requestId}`);
      console.log(`🔴 Status: CANCELLED - No riders available`);
      
      // Mark as cancelled
      await RideRequest.findOneAndUpdate(
        { requestId },
        { status: 'cancelled', cancelledAt: new Date() }
      );
      
      // Notify IoT device - Red LED
      if (io) {
        io.emit(`booth:${request.boothId}:status`, {
          requestId,
          status: 'cancelled',
          ledColor: 'red',
          message: 'No riders available'
        });
      }
      return;
    }

    // Filter out riders who have already been offered
    const attemptedRiderIds = request.offerAttempts.map(a => a.riderId);
    console.log(`📋 Previously attempted riders: [${attemptedRiderIds.join(', ')}]`);
    
    const availableCandidates = candidates.filter(c => !attemptedRiderIds.includes(c.riderId));
    console.log(`✅ Available candidates after filtering: ${availableCandidates.length} riders`);
    
    if (availableCandidates.length > 0) {
      console.log(`   → Next candidate: ${availableCandidates[0].riderId} (${availableCandidates[0].distance.toFixed(0)}m away)`);
    }

    if (availableCandidates.length === 0) {
      console.log(`❌ All nearby riders have been offered for request ${requestId}`);
      console.log(`🔴 Status: CANCELLED - No more riders to try`);
      
      // Mark as cancelled
      await RideRequest.findOneAndUpdate(
        { requestId },
        { status: 'cancelled', cancelledAt: new Date() }
      );
      
      // Notify IoT device - Red LED
      if (io) {
        io.emit(`booth:${request.boothId}:status`, {
          requestId,
          status: 'cancelled',
          ledColor: 'red',
          message: 'All riders rejected'
        });
      }
      return;
    }

    // Offer to the first available candidate
    const nextCandidate = availableCandidates[0];
    await offerToRider(requestId, nextCandidate.riderId);

  } catch (error) {
    console.error('Error in processOfferAssignment:', error);
  }
}

/**
 * Offer ride to a specific rider with 30-second timeout
 */
async function offerToRider(requestId, riderId) {
  try {
    const offerExpiresAt = new Date(Date.now() + 30000); // 30 seconds timeout per rider

    // Atomic update to set offer state
    const request = await RideRequest.findOneAndUpdate(
      { requestId, status: 'pending' },
      {
        $set: {
          status: 'offering',
          currentOfferRider: riderId,
          offerExpiresAt
        },
        $push: {
          offerAttempts: {
            riderId,
            offeredAt: new Date(),
            response: null
          }
        }
      },
      { new: true }
    );

    if (!request) {
      console.log(`⚠️  Could not update request ${requestId} for offering`);
      return;
    }

    console.log(`📤 Offering ride ${requestId} to rider ${riderId}`);
    console.log(`⏱️  30-second timeout started (expires at ${offerExpiresAt.toISOString()})`);
    console.log(`🟡 Status: OFFERING - Waiting for rider response...`);

    // Get booth details
    const sourceBooth = await Booth.findOne({ boothId: request.boothId });
    const destBooth = await Booth.findOne({ boothId: request.destinationId });

    // Get rider's connection and send offer
    const rider = await Rider.findOne({ riderId });
    
    if (rider) {
      const offerData = {
        requestId,
        riderId,
        boothId: request.boothId,
        destinationId: request.destinationId,
        boothName: sourceBooth?.name || 'Unknown',
        destinationName: destBooth?.name || 'Unknown',
        distance: request.distance || 0,
        pickupLocation: request.sourceLocation,
        destinationLocation: request.destinationLocation,
        expiresAt: offerExpiresAt,
        timeout: 30 // 30 seconds
      };

      // Send via WebSocket if rider is connected via IoT device
      if (rider.connectionType === 'websocket' && wsConnections && wsConnections.has(riderId)) {
        const ws = wsConnections.get(riderId);
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(JSON.stringify({
            type: 'ride:offer',
            ...offerData
          }));
          console.log(`✉️  Offer sent to rider ${riderId} via WebSocket (IoT device)`);
        } else {
          console.log(`⚠️  Rider ${riderId} WebSocket not ready (state: ${ws.readyState})`);
        }
      }
      // Send via Socket.IO if rider is connected via web/simulator
      else if (rider.socketId && io) {
        io.to(rider.socketId).emit('offer', offerData);
        console.log(`✉️  Offer sent to rider ${riderId} via Socket.IO socket ${rider.socketId}`);
      } else {
        console.log(`⚠️  Rider ${riderId} not connected (no socket or websocket)`);
      }
    } else {
      console.log(`⚠️  Rider ${riderId} not found in database`);
    }

    // Emit to admin
    if (io) {
      io.emit('request:updated', request);
      
      // Keep IoT device showing yellow (still searching)
      io.emit(`booth:${request.boothId}:status`, {
        requestId,
        status: 'offering',
        ledColor: 'yellow',
        message: `Waiting for rider ${riderId} response...`,
        riderId,
        timeout: 30
      });
    }

  } catch (error) {
    console.error('Error in offerToRider:', error);
  }
}

/**
 * Rider accepts offer
 * POST /api/rider/accept
 */
async function acceptOffer(req, res) {
  try {
    const { requestId, riderId } = req.body;

    if (!requestId || !riderId) {
      return res.status(400).json({ error: 'requestId and riderId are required' });
    }

    console.log(`✅ Rider ${riderId} accepting offer for request ${requestId}`);

    // Atomic update: accept only if still offering to this rider and not expired
    const request = await RideRequest.findOneAndUpdate(
      {
        requestId,
        status: 'offering',
        currentOfferRider: riderId,
        offerExpiresAt: { $gt: new Date() }
      },
      {
        $set: {
          status: 'accepted',
          assignedRider: riderId,
          acceptedAt: new Date(),
          currentOfferRider: null,
          offerExpiresAt: null
        }
      },
      { new: true }
    );

    if (!request) {
      return res.status(400).json({ 
        error: 'Offer expired, already accepted by another rider, or invalid request' 
      });
    }

    // Update offer attempt
    await RideRequest.updateOne(
      { requestId, 'offerAttempts.riderId': riderId },
      {
        $set: {
          'offerAttempts.$.response': 'accepted',
          'offerAttempts.$.respondedAt': new Date()
        }
      }
    );

    // Update rider status
    await Rider.findOneAndUpdate(
      { riderId },
      {
        $set: { status: 'onride' },
        $inc: { acceptedRides: 1 }
      }
    );

    console.log(`🎉 Request ${requestId} accepted by rider ${riderId}`);
    console.log(`🟢 Status: ACCEPTED - Rider is on the way`);

    // Emit to admin and other clients
    if (io) {
      io.emit('request:updated', request);
      
      const rider = await Rider.findOne({ riderId });
      if (rider && rider.socketId) {
        io.to(rider.socketId).emit('offer_accepted', { requestId });
      }
      
      // Notify IoT device - Green LED (Rider accepted)
      io.emit(`booth:${request.boothId}:status`, {
        requestId,
        status: 'accepted',
        ledColor: 'green',
        message: `Rider ${riderId} is on the way`,
        riderId
      });
    }

    res.json({
      success: true,
      message: 'Offer accepted',
      status: 'accepted',
      request
    });

  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Rider rejects offer
 * POST /api/rider/reject
 */
async function rejectOffer(req, res) {
  try {
    const { requestId, riderId } = req.body;

    if (!requestId || !riderId) {
      return res.status(400).json({ error: 'requestId and riderId are required' });
    }

    console.log(`❌ Rider ${riderId} rejecting offer for request ${requestId}`);

    // Atomic update: reset to pending if currently offered to this rider
    const request = await RideRequest.findOneAndUpdate(
      {
        requestId,
        status: 'offering',
        currentOfferRider: riderId
      },
      {
        $set: {
          status: 'pending',
          currentOfferRider: null,
          offerExpiresAt: null
        }
      },
      { new: true }
    );

    if (!request) {
      return res.status(400).json({ error: 'Invalid request or offer already expired' });
    }

    // Update offer attempt
    await RideRequest.updateOne(
      { requestId, 'offerAttempts.riderId': riderId },
      {
        $set: {
          'offerAttempts.$.response': 'rejected',
          'offerAttempts.$.respondedAt': new Date()
        }
      }
    );

    // Update rider stats
    const rider = await Rider.findOneAndUpdate(
      { riderId },
      { $inc: { rejectedOffers: 1 } },
      { new: true }
    );

    console.log(`🔄 Request ${requestId} back to pending, will try next candidate`);

    // Emit to admin and rider
    if (io) {
      io.emit('request:updated', request);
      
      // Notify rider that offer is cancelled
      if (rider && rider.socketId) {
        io.to(rider.socketId).emit('offer:cancelled', {
          requestId,
          message: 'You rejected this offer',
          reason: 'rejected'
        });
      }
    }

    // Continue offering to next candidate (use setTimeout to ensure DB update completes)
    setTimeout(() => {
      console.log(`🔄 Attempting to find next candidate for ${requestId}...`);
      processOfferAssignment(requestId);
    }, 100);

    res.json({
      success: true,
      message: 'Offer rejected',
      status: 'pending'
    });

  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Rider marks passenger as picked up
 * POST /api/rider/pickup
 */
async function markPickup(req, res) {
  try {
    const { requestId, riderId } = req.body;

    if (!requestId || !riderId) {
      return res.status(400).json({ error: 'requestId and riderId are required' });
    }

    console.log(`🚗 Rider ${riderId} picking up passenger for request ${requestId}`);

    const request = await RideRequest.findOneAndUpdate(
      {
        requestId,
        assignedRider: riderId,
        status: 'accepted'
      },
      {
        $set: {
          status: 'picked_up',
          pickedUpAt: new Date()
        }
      },
      { new: true }
    );

    if (!request) {
      return res.status(400).json({ error: 'Invalid request or already picked up' });
    }

    console.log(`✅ Passenger picked up for request ${requestId}`);

    // Emit to admin
    if (io) {
      io.emit('request:updated', request);
    }

    res.json({
      success: true,
      message: 'Pickup confirmed',
      request
    });

  } catch (error) {
    console.error('Error marking pickup:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Rider marks ride as completed (dropoff)
 * POST /api/rider/dropoff
 */
async function markDropoff(req, res) {
  try {
    const { requestId, riderId } = req.body;

    if (!requestId || !riderId) {
      return res.status(400).json({ error: 'requestId and riderId are required' });
    }

    console.log(`🏁 Rider ${riderId} completing dropoff for request ${requestId}`);

    const request = await RideRequest.findOneAndUpdate(
      {
        requestId,
        assignedRider: riderId,
        status: 'picked_up'
      },
      {
        $set: {
          status: 'completed',
          completedAt: new Date()
        }
      },
      { new: true }
    );

    if (!request) {
      return res.status(400).json({ error: 'Invalid request or not picked up yet' });
    }

    // Calculate distance
    const distance = haversineDistance(
      request.sourceLocation.coordinates,
      request.destinationLocation.coordinates
    );

    // Calculate points
    const points = calculatePoints(distance);

    console.log(`📊 Distance: ${distance.toFixed(2)}m, Points: ${points}`);

    // Create ride log
    const rideLog = await RideLog.create({
      requestId,
      riderId,
      boothId: request.boothId,
      destinationId: request.destinationId,
      distanceMeters: distance,
      pointsEarned: points,
      pickupTime: request.pickedUpAt,
      dropoffTime: request.completedAt,
      duration: Math.floor((request.completedAt - request.pickedUpAt) / 1000)
    });

    // Check if distance > 100m (pending review)
    if (distance > 100) {
      await PointPendingReview.create({
        rideLogId: rideLog._id,
        requestId,
        riderId,
        distanceMeters: distance,
        pointsProposed: points,
        status: 'pending'
      });

      console.log(`⏳ Points pending review for ride ${requestId} (distance > 100m)`);
    } else {
      // Auto-approve points for rides <= 100m
      await Rider.findOneAndUpdate(
        { riderId },
        { $inc: { pointsBalance: points, completedRides: 1 } }
      );

      console.log(`✅ Points ${points} auto-approved and added to rider ${riderId}`);
    }

    // Update rider status back to online
    await Rider.findOneAndUpdate(
      { riderId },
      { $set: { status: 'online' } }
    );

    console.log(`🎉 Ride ${requestId} completed successfully`);

    // Emit to admin
    if (io) {
      io.emit('request:updated', request);
      io.emit('ride:completed', { requestId, riderId, points, distance });
    }

    res.json({
      success: true,
      message: 'Ride completed',
      request,
      rideLog: {
        distance,
        points,
        pendingReview: distance > 100
      }
    });

  } catch (error) {
    console.error('Error marking dropoff:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Background worker to check expired offers (10-second per rider)
 * and overall 30-second timeout
 */
function startOfferExpiryWorker() {
  setInterval(async () => {
    try {
      // 1. Find requests with expired individual offers (30-second timeout per rider)
      const expiredOffers = await RideRequest.find({
        status: 'offering',
        offerExpiresAt: { $lte: new Date() }
      });

      for (const request of expiredOffers) {
        console.log(`⏰ 30-second timeout expired for request ${request.requestId}`);
        console.log(`🔄 Moving to next candidate...`);

        // Mark attempt as expired
        await RideRequest.updateOne(
          { 
            requestId: request.requestId, 
            'offerAttempts.riderId': request.currentOfferRider 
          },
          {
            $set: {
              'offerAttempts.$.response': 'expired',
              'offerAttempts.$.respondedAt': new Date()
            }
          }
        );

        // Reset to pending to try next rider
        await RideRequest.updateOne(
          { requestId: request.requestId },
          {
            $set: {
              status: 'pending',
              currentOfferRider: null,
              offerExpiresAt: null
            }
          }
        );

        // Try next candidate
        processOfferAssignment(request.requestId);
      }

      // 2. Check for requests exceeding overall timeout (after all riders tried)
      // This cancels if no rider accepts after trying all available riders
      const twoMinutesAgo = new Date(Date.now() - 120000); // 2 minutes max overall
      const timedOutRequests = await RideRequest.find({
        status: { $in: ['pending', 'offering'] },
        createdAt: { $lte: twoMinutesAgo }
      });

      for (const request of timedOutRequests) {
        console.log(`❌ Overall timeout reached for request ${request.requestId}`);
        console.log(`🔴 Status: CANCELLED - No rider accepted after trying all available riders`);

        // Mark as cancelled
        await RideRequest.updateOne(
          { requestId: request.requestId },
          {
            $set: {
              status: 'cancelled',
              cancelledAt: new Date(),
              currentOfferRider: null,
              offerExpiresAt: null
            }
          }
        );

        // Notify IoT device - Red LED
        if (io) {
          io.emit(`booth:${request.boothId}:status`, {
            requestId: request.requestId,
            status: 'cancelled',
            ledColor: 'red',
            message: 'No rider accepted - Timeout (30s)'
          });
          
          io.emit('request:updated', await RideRequest.findOne({ requestId: request.requestId }));
        }
      }

    } catch (error) {
      console.error('Error in offer expiry worker:', error);
    }
  }, 2000); // Check every 2 seconds for faster response

  console.log('🔄 Offer expiry worker started (10s per rider, 30s overall timeout)');
}

module.exports = {
  setSocketIO,
  setWebSocketConnections,
  createRideRequest,
  acceptOffer,
  rejectOffer,
  markPickup,
  markDropoff,
  startOfferExpiryWorker
};
