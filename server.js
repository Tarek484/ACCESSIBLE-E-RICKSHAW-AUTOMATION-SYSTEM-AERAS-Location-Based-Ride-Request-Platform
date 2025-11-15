require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const WebSocket = require('ws');
const cors = require('cors');
const axios = require('axios');
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

// Initialize Socket.io with CORS (for web clients)
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.BACKEND_URL || 'http://localhost:5000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

        // Demo: Create a test ride request after 10 seconds
        setTimeout(async () => {
          try {
            console.log(`🧪 Creating demo ride request for testing rider ${riderId}...`);
            const response = await axios.post(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/booth/request`, {
              boothId: 'SOURCE-BOOTH-01',
              destinationId: 'DEST-01'
            });
            console.log(`✅ Demo ride request created: ${response.data.requestId}`);
          } catch (error) {
            console.error('❌ Demo ride request failed:', error.message);
          }
        }, 10000);

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

// WebSocket Server for IoT Devices (ESP32, Arduino, etc.)
// Attach to the same HTTP server for internet connectivity
const wss = new WebSocket.Server({ 
  server: server,
  path: '/ws/iot'
});

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`🔌 IoT Device connected via WebSocket from ${clientIp}`);
  
  let deviceId = null;
  let deviceType = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle device identification
      if (data.type === 'identify') {
        deviceId = data.deviceId;
        deviceType = data.deviceType || 'unknown';
        console.log(`✅ IoT Device identified: ${deviceId} (${deviceType})`);
        
        ws.send(JSON.stringify({
          type: 'identified',
          deviceId,
          timestamp: new Date().toISOString()
        }));

        // Demo: Create a test ride request after 10 seconds for IoT device
        setTimeout(async () => {
          try {
            console.log(`🧪 Creating demo ride request for testing IoT device ${deviceId}...`);
            const response = await axios.post(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/booth/request`, {
              boothId: 'SOURCE-BOOTH-01',
              destinationId: 'DEST-01'
            });
            console.log(`✅ Demo ride request created: ${response.data.requestId}`);
          } catch (error) {
            console.error('❌ Demo ride request failed:', error.message);
          }
        }, 10000);
        
        return;
      }

      // Handle rider heartbeat from IoT device
      if (data.type === 'rider:heartbeat') {
        const { riderId, latitude, longitude } = data;
        console.log(`📍 IoT Rider ${riderId}: [${latitude}, ${longitude}]`);
        
        // Forward to Socket.IO clients
        io.emit('rider:location:updated', {
          riderId,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        });
        
        // Send acknowledgment back to IoT device
        ws.send(JSON.stringify({
          type: 'heartbeat_ack',
          riderId,
          status: 'received'
        }));
      }

      // Handle ride offer acceptance from IoT device
      if (data.type === 'rider:accept') {
        const { riderId, requestId } = data;
        console.log(`✅ IoT Rider ${riderId} accepted ride ${requestId}`);
        
        // Forward to Socket.IO
        io.emit('ride:accepted', {
          riderId,
          requestId,
          timestamp: new Date().toISOString()
        });
      }

      // Handle ride offer rejection from IoT device
      if (data.type === 'rider:reject') {
        const { riderId, requestId } = data;
        console.log(`❌ IoT Rider ${riderId} rejected ride ${requestId}`);
        
        // Forward to Socket.IO
        io.emit('ride:rejected', {
          riderId,
          requestId,
          timestamp: new Date().toISOString()
        });
      }

      // Handle booth request from IoT device
      if (data.type === 'booth:request') {
        const { boothId, destinationId } = data;
        console.log(`🏢 IoT Booth ${boothId} requesting ride to ${destinationId}`);
        
        // Forward to Socket.IO
        io.emit('booth:request', {
          boothId,
          destinationId,
          timestamp: new Date().toISOString()
        });
      }

      // Forward any other IoT data to Socket.IO clients
      if (deviceId) {
        io.emit('iot_data', {
          deviceId,
          deviceType,
          data,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error parsing IoT WebSocket message:', error.message);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log(`🔌 IoT Device disconnected: ${deviceId || 'Unknown'}`);
  });

  ws.on('error', (error) => {
    console.error('❌ IoT WebSocket error:', error.message);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to E-Rickshaw WebSocket Server',
    timestamp: new Date().toISOString()
  }));
});

// Forward Socket.IO events to IoT devices
io.on('connection', (socket) => {
  // When a ride offer is sent, notify IoT devices via WebSocket
  socket.on('offer:sent', (data) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'ride:offer',
          ...data,
          timestamp: new Date().toISOString()
        }));
      }
    });
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
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
      const wsUrl = backendUrl.replace('http', 'ws');
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 E-Rickshaw Automation System Started');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 HTTP Server: ${backendUrl}`);
      console.log(`🔌 Socket.io (Web): ${wsUrl}`);
      console.log(`🔌 WebSocket (IoT): ${wsUrl}/ws/iot`);
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
  
  // Force exit after 3 seconds if graceful shutdown fails
  const forceExitTimer = setTimeout(() => {
    console.log('⚠️  Force closing server...');
    process.exit(1);
  }, 3000);
  
  try {
    // Mark all online riders as offline
    await Rider.updateMany(
      { status: 'online' },
      { $set: { status: 'offline', socketId: null } }
    );
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
  
  server.close(() => {
    clearTimeout(forceExitTimer);
    console.log('✅ Server closed');
    process.exit(0);
  });
  
  // If server.close() doesn't call callback, force exit
  setTimeout(() => {
    console.log('⚠️  Force closing...');
    process.exit(0);
  }, 2000);
});

module.exports = { app, io };
