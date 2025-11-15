const express = require('express');
const router = express.Router();
const RideRequest = require('../models/RideRequest');
const RideLog = require('../models/RideLog');
const Rider = require('../models/Rider');
const Booth = require('../models/Booth');
const PointPendingReview = require('../models/PointPendingReview');
const AdminUser = require('../models/AdminUser');

// GET /api/admin/dashboard/stats - Dashboard overview statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Total active users (riders with status online or inride)
    const activeRiders = await Rider.countDocuments({ 
      status: { $in: ['online', 'inride'] } 
    });

    // Online riders only
    const onlineRiders = await Rider.countDocuments({ status: 'online' });

    // Active rides (accepted or picked_up)
    const activeRides = await RideRequest.countDocuments({ 
      status: { $in: ['accepted', 'picked_up'] } 
    });

    // Pending point reviews
    const pendingReviews = await PointPendingReview.countDocuments({ 
      status: 'pending' 
    });

    // Total completed rides today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = await RideRequest.countDocuments({
      status: 'completed',
      completedAt: { $gte: today }
    });

    // Total riders
    const totalRiders = await Rider.countDocuments({});

    // Total booths
    const totalBooths = await Booth.countDocuments({});

    // System health (last 5 minutes activity)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentActivity = await RideRequest.countDocuments({
      createdAt: { $gte: fiveMinutesAgo }
    });

    res.json({
      success: true,
      stats: {
        activeRiders,
        onlineRiders,
        activeRides,
        pendingReviews,
        completedToday,
        totalRiders,
        totalBooths,
        systemHealth: recentActivity > 0 ? 'active' : 'idle'
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/rides - Get all rides with filters
router.get('/rides', async (req, res) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      boothId, 
      riderId,
      page = 1,
      limit = 20 
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (boothId) query.boothId = boothId;
    if (riderId) query.riderId = riderId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const rides = await RideRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await RideRequest.countDocuments(query);

    // Enrich with booth and rider details
    for (let ride of rides) {
      const booth = await Booth.findOne({ boothId: ride.boothId });
      const destBooth = await Booth.findOne({ boothId: ride.destinationId });
      const rider = await Rider.findOne({ riderId: ride.riderId });

      ride.boothName = booth?.name;
      ride.destinationName = destBooth?.name;
      ride.riderName = rider?.name;
    }

    res.json({
      success: true,
      rides,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/destinations - Most requested destinations
router.get('/analytics/destinations', async (req, res) => {
  try {
    const destinations = await RideRequest.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: '$destinationId',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Enrich with booth names
    for (let dest of destinations) {
      const booth = await Booth.findOne({ boothId: dest._id });
      dest.name = booth?.name || dest._id;
      dest.destinationId = dest._id;
    }

    res.json({
      success: true,
      destinations
    });

  } catch (error) {
    console.error('Error fetching destination analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/times - Average wait & completion times
router.get('/analytics/times', async (req, res) => {
  try {
    const completedRides = await RideLog.find({}).lean();

    if (completedRides.length === 0) {
      return res.json({
        success: true,
        averageWaitTime: 0,
        averageCompletionTime: 0,
        totalRides: 0
      });
    }

    // Calculate average wait time (request to pickup)
    const waitTimes = await RideRequest.aggregate([
      {
        $match: { 
          status: 'completed',
          pickedUpAt: { $exists: true }
        }
      },
      {
        $project: {
          waitTime: {
            $subtract: ['$pickedUpAt', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgWaitTime: { $avg: '$waitTime' }
        }
      }
    ]);

    // Calculate average completion time (pickup to dropoff)
    const completionTimes = await RideRequest.aggregate([
      {
        $match: { 
          status: 'completed',
          completedAt: { $exists: true },
          pickedUpAt: { $exists: true }
        }
      },
      {
        $project: {
          completionTime: {
            $subtract: ['$completedAt', '$pickedUpAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgCompletionTime: { $avg: '$completionTime' }
        }
      }
    ]);

    res.json({
      success: true,
      averageWaitTime: Math.round((waitTimes[0]?.avgWaitTime || 0) / 1000), // seconds
      averageCompletionTime: Math.round((completionTimes[0]?.avgCompletionTime || 0) / 1000), // seconds
      totalRides: completedRides.length
    });

  } catch (error) {
    console.error('Error fetching time analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/leaderboard - Rider leaderboard
router.get('/analytics/leaderboard', async (req, res) => {
  try {
    const leaderboard = await Rider.find({})
      .sort({ pointsBalance: -1, completedRides: -1 })
      .limit(20)
      .select('riderId name pointsBalance completedRides acceptedRides status')
      .lean();

    res.json({
      success: true,
      leaderboard
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/points/adjust - Manual point adjustment
router.post('/points/adjust', async (req, res) => {
  try {
    const { riderId, points, reason } = req.body;

    if (!riderId || points === undefined) {
      return res.status(400).json({ 
        error: 'riderId and points are required' 
      });
    }

    const rider = await Rider.findOneAndUpdate(
      { riderId },
      { $inc: { pointsBalance: parseInt(points) } },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    console.log(`✏️  Admin adjusted points for ${riderId}: ${points > 0 ? '+' : ''}${points} (Reason: ${reason || 'N/A'})`);

    res.json({
      success: true,
      message: 'Points adjusted successfully',
      rider: {
        riderId: rider.riderId,
        name: rider.name,
        pointsBalance: rider.pointsBalance
      }
    });

  } catch (error) {
    console.error('Error adjusting points:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/rider/ban - Ban/suspend rider
router.post('/rider/ban', async (req, res) => {
  try {
    const { riderId, banned, reason } = req.body;

    if (!riderId || banned === undefined) {
      return res.status(400).json({ 
        error: 'riderId and banned status are required' 
      });
    }

    const rider = await Rider.findOneAndUpdate(
      { riderId },
      { 
        $set: { 
          status: banned ? 'offline' : 'online',
          banned: banned,
          banReason: reason || null
        } 
      },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    console.log(`${banned ? '🚫' : '✅'} Admin ${banned ? 'banned' : 'unbanned'} rider ${riderId} (Reason: ${reason || 'N/A'})`);

    res.json({
      success: true,
      message: `Rider ${banned ? 'banned' : 'unbanned'} successfully`,
      rider: {
        riderId: rider.riderId,
        name: rider.name,
        banned: rider.banned,
        status: rider.status
      }
    });

  } catch (error) {
    console.error('Error banning/unbanning rider:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/reviews - Get pending point reviews
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await PointPendingReview.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with ride and rider details
    for (let review of reviews) {
      const rideLog = await RideLog.findById(review.rideLogId);
      const rider = await Rider.findOne({ riderId: review.riderId });
      
      review.riderName = rider?.name;
      review.distance = review.distanceMeters;
      review.proposedPoints = review.pointsProposed;
    }

    res.json({
      success: true,
      reviews
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/reviews/:id/approve - Approve point review
router.post('/reviews/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    const review = await PointPendingReview.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: 'approved',
          pointsApproved: points || review.pointsProposed,
          reviewedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Add points to rider
    await Rider.findOneAndUpdate(
      { riderId: review.riderId },
      { $inc: { pointsBalance: points || review.pointsProposed } }
    );

    console.log(`✅ Admin approved review ${id} - ${points || review.pointsProposed} points added to ${review.riderId}`);

    res.json({
      success: true,
      message: 'Review approved',
      review
    });

  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/reviews/:id/reject - Reject point review
router.post('/reviews/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await PointPendingReview.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: 'rejected',
          rejectionReason: reason,
          reviewedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    console.log(`❌ Admin rejected review ${id} for ${review.riderId} (Reason: ${reason || 'N/A'})`);

    res.json({
      success: true,
      message: 'Review rejected',
      review
    });

  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
