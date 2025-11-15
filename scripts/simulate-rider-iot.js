/**
 * IoT Rider Device Simulator
 * Simulates an IoT device that:
 * 1. Connects to backend via Socket.io
 * 2. Sends heartbeat to go online
 * 3. Receives ride offers
 * 4. Can accept/reject via HTTP
 * 5. Updates location continuously to simulate movement
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:5000';
const RIDER_ID = process.argv[2] || 'RIDER-001';
let CURRENT_LATITUDE = parseFloat(process.argv[3]) || 22.4625;
let CURRENT_LONGITUDE = parseFloat(process.argv[4]) || 91.9692;

// Track current ride state
let currentRide = null;
let pickupLocation = null;
let destinationLocation = null;
let locationUpdateInterval = null;

console.log('🚗 IoT Rider Device Starting...');
console.log(`Rider ID: ${RIDER_ID}`);
console.log(`Location: [${CURRENT_LATITUDE}, ${CURRENT_LONGITUDE}]`);
console.log('─────────────────────────────────────\n');

// Connect to Socket.io
const socket = io(BACKEND_URL);

socket.on('connect', () => {
  console.log('✅ Connected to backend');
  
  // Emit rider connection event
  socket.emit('rider:connect', { riderId: RIDER_ID });
  
  // Check for active ride first, then go online
  checkActiveRide();
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from backend');
});

// Listen for ride offers
socket.on('offer', async (data) => {
  console.log('\n📣 NEW RIDE OFFER RECEIVED!');
  console.log('─────────────────────────────────────');
  console.log(`Request ID: ${data.requestId}`);
  console.log(`Pickup: ${data.boothName}`);
  console.log(`Destination: ${data.destinationName}`);
  console.log(`Distance: ${data.distance}m`);
  console.log(`Expires at: ${new Date(data.expiresAt).toLocaleTimeString()}`);
  console.log('─────────────────────────────────────');
  
  console.log('⏳ Waiting 30 seconds for decision...');
  console.log('   (Will auto-reject if no action taken)\n');
  
  // Auto-reject after 30 seconds if no manual action
  const rejectTimer = setTimeout(async () => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/rider/reject`, {
        requestId: data.requestId,
        riderId: RIDER_ID
      });
      
      console.log('❌ OFFER AUTO-REJECTED (Timeout)');
      console.log(`Status: ${response.data.status}`);
      console.log(`Message: ${response.data.message}\n`);
      
    } catch (error) {
      console.error('❌ Reject failed:', error.response?.data?.error || error.message);
    }
  }, 30000);
  
  // Store offer data and timer
  currentRide = {
    requestId: data.requestId,
    rejectTimer: rejectTimer,
    pickupLat: data.pickupLocation?.coordinates[1],
    pickupLon: data.pickupLocation?.coordinates[0],
    destLat: data.destinationLocation?.coordinates[1],
    destLon: data.destinationLocation?.coordinates[0]
  };
  
  console.log('\n💡 To manually accept this ride, use Postman or type: acceptRide()\n');
});

// Listen for offer cancellation
socket.on('offer:cancelled', (data) => {
  console.log('\n⚠️ OFFER CANCELLED');
  console.log(`Request ID: ${data.requestId}`);
  console.log(`Reason: ${data.message}`);
  
  // Reset ride state
  if (currentRide && currentRide.requestId === data.requestId) {
    // Clear the auto-reject timer
    if (currentRide.rejectTimer) {
      clearTimeout(currentRide.rejectTimer);
    }
    
    clearInterval(locationUpdateInterval);
    currentRide = null;
    pickupLocation = null;
    destinationLocation = null;
    
    console.log('✅ Offer cleared, ready for new offers\n');
  }
});

// Manual accept function (for testing - type in console or use external trigger)
global.acceptRide = async function() {
  if (!currentRide) {
    console.log('❌ No active offer to accept');
    return;
  }
  
  try {
    // Clear auto-reject timer
    clearTimeout(currentRide.rejectTimer);
    
    const response = await axios.post(`${BACKEND_URL}/api/rider/accept`, {
      requestId: currentRide.requestId,
      riderId: RIDER_ID
    });
    
    console.log('\n✅ OFFER ACCEPTED!');
    console.log(`Status: ${response.data.status}`);
    console.log(`Message: ${response.data.message}\n`);
    
    // Start moving to pickup location
    pickupLocation = { lat: currentRide.pickupLat, lon: currentRide.pickupLon };
    destinationLocation = { lat: currentRide.destLat, lon: currentRide.destLon };
    
    console.log('🚗 Starting journey to PICKUP location...');
    console.log(`   Target: [${pickupLocation.lat}, ${pickupLocation.lon}]\n`);
    
    startMovement();
    
  } catch (error) {
    console.error('❌ Accept failed:', error.response?.data?.error || error.message);
    currentRide = null;
  }
};

// Function to start movement with location updates
function startMovement() {
    // Start location update loop (every 2 seconds)
    locationUpdateInterval = setInterval(async () => {
      if (!currentRide) {
        clearInterval(locationUpdateInterval);
        return;
      }
      
      if (pickupLocation) {
        const arrived = moveTowards(pickupLocation.lat, pickupLocation.lon);
        await updateLocation();
        
        if (arrived) {
          console.log('\n✅ ARRIVED AT PICKUP!');
          pickupLocation = null;
          
          // Mark pickup
          setTimeout(async () => {
            try {
              await axios.post(`${BACKEND_URL}/api/rider/pickup`, {
                requestId: currentRide.requestId,
                riderId: RIDER_ID
              });
              console.log('✅ PASSENGER PICKED UP!\n');
              console.log('🚗 Starting journey to DESTINATION...');
              console.log(`   Target: [${destinationLocation.lat}, ${destinationLocation.lon}]\n`);
            } catch (err) {
              console.error('❌ Pickup marking failed:', err.message);
            }
          }, 2000);
        }
      }
      // Moving to destination
      else if (destinationLocation) {
        const arrived = moveTowards(destinationLocation.lat, destinationLocation.lon);
        await updateLocation();
        
        if (arrived) {
          console.log('\n✅ ARRIVED AT DESTINATION!');
          
          // Mark dropoff
          setTimeout(async () => {
            try {
              const response = await axios.post(`${BACKEND_URL}/api/rider/dropoff`, {
                requestId: currentRide.requestId,
                riderId: RIDER_ID
              });
              console.log('✅ PASSENGER DROPPED OFF!');
              console.log(`Points earned: ${response.data.pointsEarned || 0}`);
              console.log('\n🎧 Ride completed! Back online, listening for new offers...\n');
              
              // Reset state
              clearInterval(locationUpdateInterval);
              currentRide = null;
              destinationLocation = null;
            } catch (err) {
              console.error('❌ Dropoff marking failed:', err.message);
            }
          }, 2000);
        }
      }
    }, 2000); // Update location every 2 seconds
}

// Function to check for active ride on reconnect
async function checkActiveRide() {
  try {
    console.log('🔍 Checking for active ride...');
    
    const response = await axios.get(`${BACKEND_URL}/api/rider/${RIDER_ID}/active-ride`);
    
    if (response.data.hasActiveRide) {
      const ride = response.data.ride;
      console.log('\n⚠️  ACTIVE RIDE FOUND!');
      console.log('─────────────────────────────────────');
      console.log(`Request ID: ${ride.requestId}`);
      console.log(`Status: ${ride.status.toUpperCase()}`);
      console.log(`Pickup: ${ride.boothName}`);
      console.log(`Destination: ${ride.destinationName}`);
      console.log('─────────────────────────────────────\n');
      
      // Resume the ride
      currentRide = {
        requestId: ride.requestId,
        pickupLat: ride.pickupLocation.coordinates[1],
        pickupLon: ride.pickupLocation.coordinates[0],
        destLat: ride.destinationLocation.coordinates[1],
        destLon: ride.destinationLocation.coordinates[0]
      };
      
      if (ride.status === 'accepted') {
        console.log('🚗 Resuming journey to PICKUP location...');
        console.log(`   Target: [${currentRide.pickupLat}, ${currentRide.pickupLon}]\n`);
        pickupLocation = { lat: currentRide.pickupLat, lon: currentRide.pickupLon };
        destinationLocation = { lat: currentRide.destLat, lon: currentRide.destLon };
        startMovement();
      } else if (ride.status === 'picked_up') {
        console.log('🚗 Resuming journey to DESTINATION...');
        console.log(`   Target: [${currentRide.destLat}, ${currentRide.destLon}]\n`);
        destinationLocation = { lat: currentRide.destLat, lon: currentRide.destLon };
        startMovement();
      }
    } else {
      console.log('✅ No active ride found\n');
      goOnline();
    }
  } catch (error) {
    console.error('❌ Failed to check active ride:', error.message);
    goOnline();
  }
}

// Function to update location (simulates IoT device sending GPS data)
async function updateLocation() {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/rider/heartbeat`, {
      riderId: RIDER_ID,
      latitude: CURRENT_LATITUDE,
      longitude: CURRENT_LONGITUDE,
      status: currentRide ? 'inride' : 'online'
    });
    
    // Always show location update with status
    console.log(`📍 Location: [${CURRENT_LATITUDE.toFixed(6)}, ${CURRENT_LONGITUDE.toFixed(6)}] | Status: ${currentRide ? 'INRIDE' : 'ONLINE'} | Updated ✅`);
    
    // Check if heartbeat returned active ride info
    if (response.data.activeRide && !currentRide) {
      console.log('\n⚠️  Active ride detected during heartbeat!');
      await checkActiveRide();
    }
  } catch (error) {
    console.error('❌ Location update failed:', error.message);
  }
}

// Function to move towards a target location
function moveTowards(targetLat, targetLon) {
  const latDiff = targetLat - CURRENT_LATITUDE;
  const lonDiff = targetLon - CURRENT_LONGITUDE;
  const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
  
  // If close enough (within ~10 meters), snap to target
  if (distance < 0.0001) {
    CURRENT_LATITUDE = targetLat;
    CURRENT_LONGITUDE = targetLon;
    return true; // Arrived
  }
  
  // Move 0.0005 degrees (~55 meters) per update towards target (faster for visibility)
  const step = 0.0005;
  const prevLat = CURRENT_LATITUDE;
  const prevLon = CURRENT_LONGITUDE;
  
  CURRENT_LATITUDE += (latDiff / distance) * step;
  CURRENT_LONGITUDE += (lonDiff / distance) * step;
  
  console.log(`🚗 Moving: [${prevLat.toFixed(6)}, ${prevLon.toFixed(6)}] → [${CURRENT_LATITUDE.toFixed(6)}, ${CURRENT_LONGITUDE.toFixed(6)}]`);
  
  return false; // Still moving
}

// Function to go online
async function goOnline() {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/rider/heartbeat`, {
      riderId: RIDER_ID,
      latitude: CURRENT_LATITUDE,
      longitude: CURRENT_LONGITUDE,
      status: 'online'
    });
    
    console.log('✅ Rider is now ONLINE');
    console.log(`Current location: [${CURRENT_LATITUDE}, ${CURRENT_LONGITUDE}]`);
    console.log('🎧 Listening for ride offers...\n');
    console.log('🚶 Rider moving randomly while waiting...\n');
    
    // Send heartbeat every 5 seconds and move randomly when not on ride
    setInterval(async () => {
      if (!currentRide) {
        // Simulate random movement when idle (rider walking around)
        // Move randomly in small increments (0.0001 degrees ≈ 11 meters)
        CURRENT_LATITUDE += (Math.random() - 0.5) * 0.0002;
        CURRENT_LONGITUDE += (Math.random() - 0.5) * 0.0002;
        
        try {
          await axios.post(`${BACKEND_URL}/api/rider/heartbeat`, {
            riderId: RIDER_ID,
            latitude: CURRENT_LATITUDE,
            longitude: CURRENT_LONGITUDE,
            status: 'online'
          });
          console.log(`📍 Location: [${CURRENT_LATITUDE.toFixed(6)}, ${CURRENT_LONGITUDE.toFixed(6)}] | Status: ONLINE | Updated ✅`);
        } catch (err) {
          console.error('Heartbeat failed:', err.response?.data?.error || err.message);
        }
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Failed to go online:', error.response?.data?.error || error.message);
  }
}

// Simulate pickup
async function simulatePickup(requestId) {
  try {
    console.log('\n🚗 Arriving at pickup location...');
    
    const response = await axios.post(`${BACKEND_URL}/api/rider/pickup`, {
      requestId,
      riderId: RIDER_ID
    });
    
    console.log('✅ PASSENGER PICKED UP!');
    console.log(`Status: ${response.data.status}`);
    
    // Simulate dropoff after 10 seconds
    setTimeout(() => simulateDropoff(requestId), 10000);
    
  } catch (error) {
    console.error('❌ Pickup failed:', error.response?.data?.error || error.message);
  }
}

// Simulate dropoff
async function simulateDropoff(requestId) {
  try {
    console.log('\n🏁 Arriving at destination...');
    
    const response = await axios.post(`${BACKEND_URL}/api/rider/dropoff`, {
      requestId,
      riderId: RIDER_ID
    });
    
    console.log('✅ PASSENGER DROPPED OFF!');
    console.log(`Status: ${response.data.status}`);
    console.log(`Points earned: ${response.data.pointsEarned || 0}`);
    console.log('\n🎧 Back online, listening for new offers...\n');
    
  } catch (error) {
    console.error('❌ Dropoff failed:', error.response?.data?.error || error.message);
  }
}

// Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Rider going offline...');
  socket.disconnect();
  process.exit(0);
});
