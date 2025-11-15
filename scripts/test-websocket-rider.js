/**
 * WebSocket IoT Rider Test
 * Tests WebSocket connection and ride offer reception
 */

const WebSocket = require('ws');

const BACKEND_URL = process.env.BACKEND_URL || 'ws://localhost:5000';
const WS_PATH = '/ws/iot';
const RIDER_ID = process.argv[2] || 'RIDER-TEST-WS';

console.log('🚗 WebSocket IoT Rider Test Starting...');
console.log(`Rider ID: ${RIDER_ID}`);
console.log(`Connecting to: ${BACKEND_URL}${WS_PATH}`);
console.log('─────────────────────────────────────\n');

// Create WebSocket connection
const ws = new WebSocket(`${BACKEND_URL}${WS_PATH}`);

ws.on('open', () => {
  console.log('✅ WebSocket connected!');
  
  // Send identification message
  const identifyMsg = {
    type: 'identify',
    deviceId: RIDER_ID,
    deviceType: 'ESP32-Rider-Test'
  };
  
  ws.send(JSON.stringify(identifyMsg));
  console.log('📤 Sent identification:', identifyMsg);
  console.log('\n⏳ Waiting for messages...\n');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    console.log('\n📨 MESSAGE RECEIVED:');
    console.log('─────────────────────────────────────');
    console.log(`Type: ${message.type}`);
    console.log('Full message:', JSON.stringify(message, null, 2));
    console.log('─────────────────────────────────────\n');
    
    // Handle ride offer
    if (message.type === 'ride:offer') {
      console.log('🎉 RIDE OFFER RECEIVED!');
      console.log(`   Request ID: ${message.requestId}`);
      console.log(`   Pickup: ${message.boothName}`);
      console.log(`   Destination: ${message.destinationName}`);
      console.log(`   Distance: ${message.distance}m`);
      console.log(`   Expires: ${message.expiresAt}`);
      console.log('─────────────────────────────────────\n');
    }
    
  } catch (error) {
    console.error('❌ Error parsing message:', error.message);
    console.log('Raw data:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('\n🔌 WebSocket connection closed');
  process.exit(0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Closing connection...');
  ws.close();
});

console.log('💡 Press Ctrl+C to stop\n');
