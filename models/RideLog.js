const mongoose = require('mongoose');

const rideLogSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    ref: 'RideRequest'
  },
  riderId: {
    type: String,
    required: true,
    ref: 'Rider'
  },
  boothId: {
    type: String,
    required: true,
    ref: 'Booth'
  },
  destinationId: {
    type: String,
    required: true,
    ref: 'Booth'
  },
  distanceMeters: {
    type: Number,
    required: true
  },
  pointsEarned: {
    type: Number,
    required: true
  },
  pickupTime: {
    type: Date,
    required: true
  },
  dropoffTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number // in seconds
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
rideLogSchema.index({ riderId: 1, createdAt: -1 });
rideLogSchema.index({ requestId: 1 });

module.exports = mongoose.model('RideLog', rideLogSchema);
