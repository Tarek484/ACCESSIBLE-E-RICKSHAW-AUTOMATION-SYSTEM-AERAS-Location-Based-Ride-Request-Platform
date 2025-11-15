const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes after connection
    await createIndexes();
    
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const Rider = require('../models/Rider');
    const Booth = require('../models/Booth');
    const RideRequest = require('../models/RideRequest');
    
    // Ensure 2dsphere indexes for geospatial queries
    await Rider.collection.createIndex({ location: '2dsphere' });
    await Booth.collection.createIndex({ location: '2dsphere' });
    
    // Other useful indexes
    await RideRequest.collection.createIndex({ status: 1, createdAt: -1 });
    await RideRequest.collection.createIndex({ offerExpiresAt: 1 });
    await Rider.collection.createIndex({ status: 1 });
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('⚠️  Error creating indexes:', error.message);
  }
};

module.exports = connectDB;
