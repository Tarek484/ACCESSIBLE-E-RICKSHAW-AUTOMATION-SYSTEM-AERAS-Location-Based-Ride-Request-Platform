const mongoose = require('mongoose');

const boothSchema = new mongoose.Schema({
  boothId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
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
  address: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
boothSchema.index({ location: '2dsphere' });

// Virtual for latitude/longitude
boothSchema.virtual('latitude').get(function() {
  return this.location.coordinates[1];
});

boothSchema.virtual('longitude').get(function() {
  return this.location.coordinates[0];
});

boothSchema.set('toJSON', { virtuals: true });
boothSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booth', boothSchema);
