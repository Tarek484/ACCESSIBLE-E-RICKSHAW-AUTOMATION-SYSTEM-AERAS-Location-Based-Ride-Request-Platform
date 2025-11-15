const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  riderId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  status: {
    type: String,
    enum: ['offline', 'online', 'inride'],
    default: 'offline'
  },
  socketId: {
    type: String,
    default: null
  },
  connectionType: {
    type: String,
    enum: ['socketio', 'websocket', null],
    default: null
  },
  pointsBalance: {
    type: Number,
    default: 0
  },
  acceptedRides: {
    type: Number,
    default: 0
  },
  completedRides: {
    type: Number,
    default: 0
  },
  rejectedOffers: {
    type: Number,
    default: 0
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  banned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
riderSchema.index({ location: '2dsphere' });
riderSchema.index({ status: 1 });

// Virtual for latitude/longitude
riderSchema.virtual('latitude').get(function() {
  return this.location.coordinates[1];
});

riderSchema.virtual('longitude').get(function() {
  return this.location.coordinates[0];
});

riderSchema.set('toJSON', { virtuals: true });
riderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Rider', riderSchema);
