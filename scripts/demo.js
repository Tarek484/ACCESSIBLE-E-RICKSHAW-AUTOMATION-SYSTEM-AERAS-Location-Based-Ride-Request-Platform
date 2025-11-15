require('dotenv').config();
const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎬 E-Rickshaw System Demo');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Connect a mock rider via socket
    console.log('📡 Step 1: Connecting rider RIDER-001 via Socket.io...');
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: false
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      
      // Identify as rider
      socket.emit('rider:connect', { riderId: 'RIDER-001' });
    });

    socket.on('connected', (data) => {
      console.log('✅ Rider connected:', data);
    });

    socket.on('offer', async (offer) => {
      console.log('\n🔔 Received offer:', offer);
      console.log('⏳ Waiting 3 seconds before accepting...');
      
      await sleep(3000);
      
      console.log('✅ Accepting offer...');
      
      // Accept via HTTP endpoint
      try {
        const response = await axios.post(`${BASE_URL}/api/rider/accept`, {
          requestId: offer.requestId,
          riderId: 'RIDER-001'
        });
        
        console.log('✅ Offer accepted:', response.data);
        
        // Simulate pickup after 5 seconds
        await sleep(5000);
        console.log('\n🚗 Simulating pickup...');
        
        const pickupResponse = await axios.post(`${BASE_URL}/api/rider/pickup`, {
          requestId: offer.requestId,
          riderId: 'RIDER-001'
        });
        
        console.log('✅ Pickup confirmed:', pickupResponse.data);
        
        // Simulate dropoff after 10 seconds
        await sleep(10000);
        console.log('\n🏁 Simulating dropoff...');
        
        const dropoffResponse = await axios.post(`${BASE_URL}/api/rider/dropoff`, {
          requestId: offer.requestId,
          riderId: 'RIDER-001'
        });
        
        console.log('✅ Dropoff completed:', dropoffResponse.data);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Demo completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        socket.disconnect();
        process.exit(0);
        
      } catch (error) {
        console.error('❌ Error during ride flow:', error.response?.data || error.message);
        socket.disconnect();
        process.exit(1);
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    await sleep(2000);

    // Step 2: Create a ride request from booth
    console.log('\n📝 Step 2: Creating ride request from BOOTH-001 to DEST-001...');
    
    const requestResponse = await axios.post(`${BASE_URL}/api/booth/request`, {
      boothId: 'BOOTH-001',
      destinationId: 'DEST-001'
    });

    console.log('✅ Ride request created:', {
      requestId: requestResponse.data.requestId,
      status: requestResponse.data.request.status
    });

    console.log('\n⏳ Waiting for offer to be sent to rider...');
    
    // Let the process continue (offer will be received via socket)

  } catch (error) {
    console.error('❌ Demo error:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run demo
runDemo();
