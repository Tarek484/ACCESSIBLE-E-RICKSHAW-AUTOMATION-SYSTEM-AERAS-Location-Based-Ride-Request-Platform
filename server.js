require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./utils/db');
const { setSocketIO, startOfferExpiryWorker } = require('./controllers/requestsController');
const Rider = require('./models/Rider');

// Import routes
const boothRoutes = require('./routes/booth.routes');
const boothStatusRoutes = require('./routes/booth.status.routes');
const riderRoutes = require('./routes/rider.routes');
const adminRoutes = require('./routes/admin.routes');
const adminDashboardRoutes = require('./routes/admin.dashboard.routes');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/booth', boothRoutes);
app.use('/api/booth', boothStatusRoutes); // Status check for IoT LED
app.use('/api/rider', riderRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Rider connects and identifies
  socket.on('rider:connect', async (data) => {
    try {
      const { riderId } = data;
      
      if (!riderId) {
        socket.emit('error', { message: 'riderId is required' });
        return;
      }

      // Update rider's socket ID and status
      const rider = await Rider.findOneAndUpdate(
        { riderId },
        {
          $set: {
            socketId: socket.id,
            status: 'online',
            lastSeen: new Date()
          }
        },
        { new: true }
      );

      if (rider) {
        console.log(`✅ Rider ${riderId} connected with socket ${socket.id}`);
        socket.emit('connected', { 
          riderId, 
          status: 'online',
          pointsBalance: rider.pointsBalance
        });

        // Broadcast to admin
        io.emit('rider:status:changed', {
          riderId,
          status: 'online',
          socketId: socket.id
        });
      } else {
        socket.emit('error', { message: 'Rider not found' });
      }

    } catch (error) {
      console.error('Error in rider:connect:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Rider updates location
  socket.on('rider:location:update', async (data) => {
    try {
      const { riderId, latitude, longitude } = data;

      if (!riderId || !latitude || !longitude) {
        return;
      }

      await Rider.findOneAndUpdate(
        { riderId },
        {
          $set: {
            location: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            lastSeen: new Date()
          }
        }
      );

      // Broadcast to admin for map updates
      io.emit('rider:location:updated', {
        riderId,
        latitude,
        longitude
      });

    } catch (error) {
      console.error('Error updating rider location:', error);
    }
  });

  // Rider responds to offer
  socket.on('offer_response', async (data) => {
    try {
      const { requestId, riderId, accepted } = data;

      console.log(`📩 Offer response from ${riderId} for ${requestId}: ${accepted ? 'ACCEPT' : 'REJECT'}`);

      // This will be handled by HTTP endpoints, but we can emit confirmation
      socket.emit('offer_response_received', { requestId });

    } catch (error) {
      console.error('Error handling offer response:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      // Find rider with this socket ID and mark offline
      const rider = await Rider.findOneAndUpdate(
        { socketId: socket.id },
        {
          $set: {
            status: 'offline',
            socketId: null,
            lastSeen: new Date()
          }
        }
      );

      if (rider) {
        console.log(`🔌 Rider ${rider.riderId} disconnected`);
        
        // Broadcast to admin
        io.emit('rider:status:changed', {
          riderId: rider.riderId,
          status: 'offline'
        });
      } else {
        console.log(`🔌 Socket ${socket.id} disconnected`);
      }

    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Set Socket.io instance in controller
setSocketIO(io);

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start offer expiry worker
    startOfferExpiryWorker();

    // Start HTTP server
    server.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 E-Rickshaw Automation System Started');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 HTTP Server: http://localhost:${PORT}`);
      console.log(`🔌 Socket.io: ws://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Mark all online riders as offline
  await Rider.updateMany(
    { status: 'online' },
    { $set: { status: 'offline', socketId: null } }
  );
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { app, io };
