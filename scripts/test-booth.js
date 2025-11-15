require('dotenv').config();
const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';

// Simulate IoT booth device
async function simulateBoothRequest(sourceBoothId, destinationId) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎮 IoT Booth Device Simulation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Listen for booth status updates (LED color changes)
  const boothSocket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: false
  });

  boothSocket.on('connect', () => {
    console.log(`📡 Booth ${sourceBoothId} connected to server`);
    console.log(`🔌 Socket ID: ${boothSocket.id}\n`);
  });

  // Listen for LED status changes
  boothSocket.on(`booth:${sourceBoothId}:status`, (data) => {
    console.log(`\n💡 LED STATUS UPDATE:`);
    console.log(`   Request ID: ${data.requestId}`);
    console.log(`   Status: ${data.status.toUpperCase()}`);
    console.log(`   LED Color: ${data.ledColor.toUpperCase()} 💡`);
    console.log(`   Message: ${data.message}`);
    
    if (data.ledColor === 'red') {
      console.log(`\n🔴 DISPLAY: RED LIGHT - ${data.message}`);
      setTimeout(() => {
        boothSocket.disconnect();
        process.exit(0);
      }, 2000);
    }
    
    if (data.ledColor === 'green') {
      console.log(`\n🟢 DISPLAY: GREEN LIGHT - Rider is coming!`);
    }
  });

  // Create ride request
  console.log(`📍 Creating ride request...`);
  console.log(`   Source: ${sourceBoothId}`);
  console.log(`   Destination: ${destinationId}\n`);

  try {
    const response = await axios.post(`${BASE_URL}/api/booth/request`, {
      boothId: sourceBoothId,
      destinationId: destinationId
    });

    console.log(`✅ Request created successfully!`);
    console.log(`   Request ID: ${response.data.requestId}`);
    console.log(`   Status: ${response.data.status}`);
    console.log(`   LED: ${response.data.ledColor.toUpperCase()} 💡`);
    console.log(`   Message: ${response.data.message}\n`);

    console.log(`🟡 OLED DISPLAY: YELLOW LIGHT - Searching for riders...\n`);
    console.log(`⏱️  Waiting for response (max 30 seconds)...`);

  } catch (error) {
    console.error('❌ Error creating request:', error.response?.data || error.message);
    boothSocket.disconnect();
    process.exit(1);
  }
}

// Run simulation
const sourceBoothId = process.argv[2] || 'SOURCE-BOOTH-01';
const destinationId = process.argv[3] || 'DEST-01';

simulateBoothRequest(sourceBoothId, destinationId);
