/**
 * IoT Booth Device Simulator
 * Simulates a booth IoT device that:
 * 1. Creates ride requests via HTTP
 * 2. Polls for status updates to control LED (yellow/green/red)
 * 3. Listens for real-time updates via Socket.io
 */

const io = require('socket.io-client');
const axios = require('axios');
require('dotenv').config();

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const SOURCE_BOOTH_ID = process.argv[2] || 'SOURCE-BOOTH-01';
const DEST_BOOTH_ID = process.argv[3] || 'DEST-01';

let currentRequestId = null;
let statusCheckInterval = null;

console.log('🏢 IoT Booth Device Starting...');
console.log(`Source Booth: ${SOURCE_BOOTH_ID}`);
console.log(`Destination: ${DEST_BOOTH_ID}`);
console.log('─────────────────────────────────────\n');

// Connect to Socket.io for real-time updates
const socket = io(BACKEND_URL);

socket.on('connect', () => {
  console.log('✅ Connected to backend (Socket.io)');
  console.log(`🎧 Listening for status updates on: booth:${SOURCE_BOOTH_ID}:status\n`);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from backend');
});

// Listen for real-time LED status updates via Socket.io
socket.on(`booth:${SOURCE_BOOTH_ID}:status`, (data) => {
  console.log('\n🔔 REAL-TIME STATUS UPDATE (Socket.io):');
  console.log('─────────────────────────────────────');
  displayStatus(data);
});

// Function to display status and LED
function displayStatus(data) {
  console.log(`Request ID: ${data.requestId}`);
  console.log(`Status: ${data.status.toUpperCase()}`);
  console.log(`LED Color: ${getLEDEmoji(data.ledColor)} ${data.ledColor.toUpperCase()}`);
  console.log(`Message: ${data.message}`);
  
  if (data.riderName) {
    console.log(`Rider: ${data.riderName}`);
  }
  
  console.log('─────────────────────────────────────');
  
  // Display LED simulation on OLED
  displayLED(data.ledColor);
  
  // Stop polling if ride is completed or cancelled
  if (data.ledColor === 'red' || data.status === 'completed') {
    stopStatusPolling();
  }
}

// Function to create ride request
async function createRideRequest() {
  try {
    console.log('📤 Creating ride request...\n');
    
    const response = await axios.post(`${BACKEND_URL}/api/booth/request`, {
      boothId: SOURCE_BOOTH_ID,
      destinationId: DEST_BOOTH_ID
    });
    
    currentRequestId = response.data.requestId;
    
    console.log('✅ RIDE REQUEST CREATED!');
    console.log('─────────────────────────────────────');
    console.log(`Request ID: ${currentRequestId}`);
    console.log(`Status: ${response.data.status.toUpperCase()}`);
    console.log(`LED Color: ${getLEDEmoji(response.data.ledColor)} ${response.data.ledColor.toUpperCase()}`);
    console.log(`Message: ${response.data.message}`);
    console.log('─────────────────────────────────────\n');
    
    displayLED(response.data.ledColor);
    
    console.log('⏳ Waiting for rider to accept...');
    console.log('   (Will poll status every 3 seconds)\n');
    
    // Start polling for status updates
    startStatusPolling();
    
  } catch (error) {
    console.error('❌ Request failed:', error.response?.data?.error || error.message);
  }
}

// Function to start polling status from API
function startStatusPolling() {
  // Poll every 3 seconds
  statusCheckInterval = setInterval(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/booth/request/${currentRequestId}/status`);
      const data = response.data;
      
      console.log('\n📡 STATUS CHECK (HTTP Poll):');
      console.log('─────────────────────────────────────');
      displayStatus(data);
      
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
    }
  }, 3000);
}

// Function to stop polling
function stopStatusPolling() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
    console.log('\n🛑 Status polling stopped\n');
  }
}

// Display LED on console (simulate OLED display)
function displayLED(color) {
  const ledDisplay = {
    yellow: '🟡🟡🟡 SEARCHING FOR RIDER 🟡🟡🟡',
    green: '🟢🟢🟢 RIDER ACCEPTED - COMING 🟢🟢🟢',
    red: '🔴🔴🔴 REQUEST CANCELLED 🔴🔴🔴'
  };
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log(`║  ${ledDisplay[color]}  ║`);
  console.log('╚════════════════════════════════════════╝\n');
}

// Get LED emoji
function getLEDEmoji(color) {
  const emojis = {
    yellow: '🟡',
    green: '🟢',
    red: '🔴'
  };
  return emojis[color] || '⚪';
}

// Wait 2 seconds then create request
setTimeout(() => {
  createRideRequest();
}, 2000);

// Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Booth device shutting down...');
  stopStatusPolling();
  socket.disconnect();
  process.exit(0);
});
