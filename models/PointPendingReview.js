const mongoose = require('mongoose');

const pointPendingReviewSchema = new mongoose.Schema({
  rideLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideLog',
    required: true
  },
  requestId: {
    type: String,
    required: true
  },
  riderId: {
    type: String,
    required: true,
    ref: 'Rider'
  },
  distanceMeters: {
    type: Number,
    required: true
  },
  pointsProposed: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: String,
    ref: 'AdminUser',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
pointPendingReviewSchema.index({ status: 1, createdAt: -1 });
pointPendingReviewSchema.index({ riderId: 1 });

module.exports = mongoose.model('PointPendingReview', pointPendingReviewSchema);
