require('dotenv').config();
const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';

// Simulate a rider device
async function simulateRider(riderId, latitude, longitude) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏍️  Rider Device Simulation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Connect via socket
  const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true
  });

  socket.on('connect', async () => {
    console.log(`📡 Rider ${riderId} connected`);
    console.log(`🔌 Socket ID: ${socket.id}\n`);

    // Identify as rider
    socket.emit('rider:connect', { riderId });

    // Update location to online
    try {
      await axios.post(`${BASE_URL}/api/rider/heartbeat`, {
        riderId,
        latitude,
        longitude,
        status: 'online'
      });
      console.log(`✅ Rider ${riderId} is now ONLINE`);
      console.log(`📍 Location: [${latitude}, ${longitude}]\n`);
      console.log(`⏳ Waiting for ride offers...\n`);
    } catch (error) {
      console.error('Error updating location:', error.message);
    }
  });

  socket.on('connected', (data) => {
    console.log(`✅ Connected as ${data.riderId}`);
    console.log(`💰 Points Balance: ${data.pointsBalance}\n`);
  });

  // Listen for ride offers
  socket.on('offer', async (offer) => {
    console.log(`\n🔔 NEW RIDE OFFER RECEIVED!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Request ID: ${offer.requestId}`);
    console.log(`   From: ${offer.sourceLocation?.name || offer.boothId}`);
    console.log(`   To: ${offer.destinationLocation?.name || offer.destinationId}`);
    console.log(`   Timeout: ${offer.timeout || 10} seconds`);
    console.log(`   Expires at: ${new Date(offer.expiresAt).toLocaleTimeString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Auto-accept after 2 seconds (simulate rider thinking)
    console.log(`🤔 Rider is deciding... (auto-accepting in 2s)`);
    
    setTimeout(async () => {
      try {
        console.log(`\n✅ ACCEPTING OFFER...\n`);
        
        const response = await axios.post(`${BASE_URL}/api/rider/accept`, {
          requestId: offer.requestId,
          riderId
        });

        console.log(`🎉 Offer accepted successfully!`);
        console.log(`   Status: ${response.data.status}`);
        console.log(`\n🚗 Rider is now ON RIDE\n`);

        // Simulate pickup after 5 seconds
        setTimeout(async () => {
          console.log(`📍 Arrived at pickup location...`);
          console.log(`👤 Passenger picked up!\n`);
          
          await axios.post(`${BASE_URL}/api/rider/pickup`, {
            requestId: offer.requestId,
            riderId
          });

          // Simulate dropoff after 10 seconds
          setTimeout(async () => {
            console.log(`🏁 Arrived at destination...`);
            console.log(`👋 Passenger dropped off!\n`);
            
            const dropoffResponse = await axios.post(`${BASE_URL}/api/rider/dropoff`, {
              requestId: offer.requestId,
              riderId
            });

            console.log(`✅ Ride completed!`);
            console.log(`   Distance: ${dropoffResponse.data.rideLog.distance.toFixed(2)}m`);
            console.log(`   Points Earned: ${dropoffResponse.data.rideLog.points}`);
            
            if (dropoffResponse.data.rideLog.pendingReview) {
              console.log(`   ⏳ Points pending admin review (>100m)`);
            } else {
              console.log(`   ✅ Points auto-approved (<= 100m)`);
            }

            console.log(`\n🔄 Rider is back ONLINE, ready for next ride\n`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

          }, 10000);

        }, 5000);

      } catch (error) {
        console.error(`❌ Error accepting offer:`, error.response?.data || error.message);
      }
    }, 2000);
  });

  socket.on('offer_accepted', (data) => {
    console.log(`✅ Offer acceptance confirmed by server`);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
  });
}

// Run simulation
const riderId = process.argv[2] || 'RIDER-001';
const latitude = parseFloat(process.argv[3]) || 22.4625; // CUET area
const longitude = parseFloat(process.argv[4]) || 91.9692;

simulateRider(riderId, latitude, longitude);
