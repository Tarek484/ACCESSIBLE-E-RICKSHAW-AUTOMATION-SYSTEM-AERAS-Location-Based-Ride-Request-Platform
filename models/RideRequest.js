const mongoose = require('mongoose');

const rideRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true
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
  sourceLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number]
    }
  },
  destinationLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number]
    }
  },
  status: {
    type: String,
    enum: ['pending', 'offering', 'accepted', 'picked_up', 'completed', 'cancelled'],
    default: 'pending'
  },
  assignedRider: {
    type: String,
    ref: 'Rider',
    default: null
  },
  offerExpiresAt: {
    type: Date,
    default: null
  },
  currentOfferRider: {
    type: String,
    ref: 'Rider',
    default: null
  },
  offerAttempts: [{
    riderId: String,
    offeredAt: Date,
    response: {
      type: String,
      enum: ['accepted', 'rejected', 'expired'],
      default: null
    },
    respondedAt: Date
  }],
  acceptedAt: {
    type: Date,
    default: null
  },
  pickedUpAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
rideRequestSchema.index({ status: 1, createdAt: -1 });
rideRequestSchema.index({ offerExpiresAt: 1 });
rideRequestSchema.index({ boothId: 1 });
rideRequestSchema.index({ assignedRider: 1 });

module.exports = mongoose.model('RideRequest', rideRequestSchema);
