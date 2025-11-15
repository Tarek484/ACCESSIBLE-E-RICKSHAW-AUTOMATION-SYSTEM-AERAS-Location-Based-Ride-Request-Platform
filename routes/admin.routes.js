const express = require('express');
const router = express.Router();
const AdminUser = require('../models/AdminUser');
const Rider = require('../models/Rider');
const RideRequest = require('../models/RideRequest');
const RideLog = require('../models/RideLog');
const PointPendingReview = require('../models/PointPendingReview');
const Booth = require('../models/Booth');
const { generateToken, authMiddleware } = require('../utils/auth');

// POST /api/admin/login - Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await AdminUser.findOne({ email, isActive: true });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({
      id: admin._id,
      email: admin.email,
      role: admin.role
    });

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// All routes below require authentication
router.use(authMiddleware);

// GET /api/admin/dashboard - Dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalRiders,
      onlineRiders,
      onRideRiders,
      totalRequests,
      pendingRequests,
      completedRequests,
      totalRides,
      pendingPoints
    ] = await Promise.all([
      Rider.countDocuments(),
      Rider.countDocuments({ status: 'online' }),
      Rider.countDocuments({ status: 'onride' }),
      RideRequest.countDocuments(),
      RideRequest.countDocuments({ status: { $in: ['pending', 'offering'] } }),
      RideRequest.countDocuments({ status: 'completed' }),
      RideLog.countDocuments(),
      PointPendingReview.countDocuments({ status: 'pending' })
    ]);

    res.json({
      riders: {
        total: totalRiders,
        online: onlineRiders,
        onRide: onRideRiders,
        offline: totalRiders - onlineRiders - onRideRiders
      },
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        completed: completedRequests
      },
      rides: {
        total: totalRides
      },
      points: {
        pendingReview: pendingPoints
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/requests - List all ride requests with pagination
router.get('/requests', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = status ? { status } : {};

    const requests = await RideRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await RideRequest.countDocuments(query);

    res.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/riders - List all riders
router.get('/riders', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = status ? { status } : {};

    const riders = await Rider.find(query)
      .sort({ lastSeen: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await Rider.countDocuments(query);

    res.json({
      riders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/booths - List all booths
router.get('/booths', async (req, res) => {
  try {
    const booths = await Booth.find({ isActive: true }).lean();
    res.json({ booths });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/points/pending - List pending point reviews
router.get('/points/pending', async (req, res) => {
  try {
    const pending = await PointPendingReview.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('rideLogId')
      .lean();

    res.json({ pending });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/points/approve - Approve pending points
router.post('/points/approve', async (req, res) => {
  try {
    const { reviewId } = req.body;

    const review = await PointPendingReview.findById(reviewId);

    if (!review || review.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid or already processed review' });
    }

    // Update review status
    review.status = 'approved';
    review.reviewedBy = req.user.email;
    review.reviewedAt = new Date();
    await review.save();

    // Add points to rider
    await Rider.findOneAndUpdate(
      { riderId: review.riderId },
      { 
        $inc: { 
          pointsBalance: review.pointsProposed,
          completedRides: 1
        } 
      }
    );

    console.log(`✅ Points approved for rider ${review.riderId}: ${review.pointsProposed}`);

    res.json({
      success: true,
      message: 'Points approved',
      review
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/points/reject - Reject pending points
router.post('/points/reject', async (req, res) => {
  try {
    const { reviewId, notes } = req.body;

    const review = await PointPendingReview.findById(reviewId);

    if (!review || review.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid or already processed review' });
    }

    review.status = 'rejected';
    review.reviewedBy = req.user.email;
    review.reviewedAt = new Date();
    review.notes = notes || '';
    await review.save();

    console.log(`❌ Points rejected for rider ${review.riderId}`);

    res.json({
      success: true,
      message: 'Points rejected',
      review
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/request/cancel - Cancel a ride request
router.post('/request/cancel', async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await RideRequest.findOneAndUpdate(
      { requestId, status: { $in: ['pending', 'offering'] } },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date()
        }
      },
      { new: true }
    );

    if (!request) {
      return res.status(400).json({ error: 'Request not found or cannot be cancelled' });
    }

    res.json({
      success: true,
      message: 'Request cancelled',
      request
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics - Analytics data
router.get('/analytics', async (req, res) => {
  try {
    // Get rides completed in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentRides = await RideLog.find({
      createdAt: { $gte: sevenDaysAgo }
    }).lean();

    // Top riders by completed rides
    const topRiders = await Rider.find()
      .sort({ completedRides: -1 })
      .limit(10)
      .select('riderId name completedRides pointsBalance')
      .lean();

    // Requests by status
    const requestsByStatus = await RideRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      recentRides: recentRides.length,
      topRiders,
      requestsByStatus
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
