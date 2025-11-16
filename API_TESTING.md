# 🧪 IoT API Testing Guide

## Overview

This system implements a complete ride request flow with IoT device support:

### Status Flow:
```
PENDING (🟡) → OFFERING (🟡) → ACCEPTED (🟢) → PICKED_UP → COMPLETED
           ↘ (timeout) → CANCELLED (🔴)
```

### LED Colors for IoT Devices:
- **🟡 YELLOW**: Searching for riders / Waiting for response
- **🟢 GREEN**: Rider accepted and is on the way
- **🔴 RED**: Request cancelled (no riders or timeout)

### Timeouts:
- **10 seconds per rider**: Each rider has 10 seconds to accept
- **30 seconds overall**: If no rider accepts within 30 seconds, request is cancelled
- After 10s timeout, automatically moves to next available rider

---

## 🚀 Quick Test (Automated)

### Terminal 1: Start Backend
```bash
npm start
```

### Terminal 2: Start a Rider (Auto-accepts)
```bash
npm run test:rider
```

### Terminal 3: Create Booth Request
```bash
npm run test:booth
```

**Expected Result:**
- Booth shows 🟡 YELLOW (searching)
- Rider receives offer and auto-accepts in 2 seconds
- Booth shows 🟢 GREEN (rider accepted)
- Complete ride flow (pickup → dropoff)
- Rider back online

---

## 📡 Manual API Testing

### 1. Create Ride Request (IoT Booth)

**Endpoint:** `POST /api/booth/request`

**Request:**
```bash
curl -X POST http://localhost:5000/api/booth/request ^
  -H "Content-Type: application/json" ^
  -d "{\"boothId\":\"SOURCE-BOOTH-01\",\"destinationId\":\"DEST-01\"}"
```

**Response:**
```json
{
  "success": true,
  "requestId": "REQ-1234567890-abcd1234",
  "status": "pending",
  "ledColor": "yellow",
  "message": "Request created. Searching for riders...",
  "request": { ... }
}
```

**IoT Device Action:** Display 🟡 YELLOW LED

---

### 2. Make Rider Online

**Endpoint:** `POST /api/rider/heartbeat`

**Request:**
```bash
curl -X POST http://localhost:5000/api/rider/heartbeat ^
  -H "Content-Type: application/json" ^
  -d "{\"riderId\":\"RIDER-001\",\"latitude\":22.4625,\"longitude\":91.9692,\"status\":\"online\"}"
```

**Response:**
```json
{
  "success": true,
  "rider": {
    "riderId": "RIDER-001",
    "status": "online",
    "location": {
      "latitude": 22.4625,
      "longitude": 91.9692
    }
  }
}
```

---

### 3. Accept Offer

**Endpoint:** `POST /api/rider/accept`

**Request:**
```bash
curl -X POST http://localhost:5000/api/rider/accept ^
  -H "Content-Type: application/json" ^
  -d "{\"requestId\":\"REQ-xxx\",\"riderId\":\"RIDER-001\"}"
```

**Response:**
```json
{
  "success": true,
  "message": "Offer accepted",
  "status": "accepted",
  "request": { ... }
}
```

**IoT Device Action:** Display 🟢 GREEN LED

---

### 4. Reject Offer (Optional)

**Endpoint:** `POST /api/rider/reject`

**Request:**
```bash
curl -X POST http://localhost:5000/api/rider/reject ^
  -H "Content-Type: application/json" ^
  -d "{\"requestId\":\"REQ-xxx\",\"riderId\":\"RIDER-001\"}"
```

System automatically tries next available rider.

---

### 5. Mark Pickup

**Endpoint:** `POST /api/rider/pickup`

**Request:**
```bash
curl -X POST http://localhost:5000/api/rider/pickup ^
  -H "Content-Type: application/json" ^
  -d "{\"requestId\":\"REQ-xxx\",\"riderId\":\"RIDER-001\"}"
```

---

### 6. Mark Dropoff (Complete Ride)

**Endpoint:** `POST /api/rider/dropoff`

**Request:**
```bash
curl -X POST http://localhost:5000/api/rider/dropoff ^
  -H "Content-Type: application/json" ^
  -d "{\"requestId\":\"REQ-xxx\",\"riderId\":\"RIDER-001\"}"
```

**Response:**
```json
{
  "success": true,
  "message": "Ride completed",
  "request": { ... },
  "rideLog": {
    "distance": 650.25,
    "points": 75.03,
    "pendingReview": true
  }
}
```

---

## 🎯 Test Scenarios

### Scenario 1: Happy Path (Rider Accepts)

1. Create request → 🟡 YELLOW
2. Rider online and nearby
3. Rider receives offer (10s timeout)
4. Rider accepts → 🟢 GREEN
5. Pickup → Dropoff → Complete

**Expected:** Green LED on booth, ride completed successfully

---

### Scenario 2: Rider Rejects

1. Create request → 🟡 YELLOW
2. Rider 1 receives offer
3. Rider 1 rejects within 10s
4. System moves to Rider 2 → 🟡 YELLOW
5. Rider 2 accepts → 🟢 GREEN

**Expected:** System tries multiple riders, eventually succeeds

---

### Scenario 3: 10-Second Timeout (Per Rider)

1. Create request → 🟡 YELLOW
2. Rider 1 receives offer
3. Rider 1 doesn't respond for 10s
4. Auto-timeout → System moves to Rider 2 → 🟡 YELLOW
5. Rider 2 accepts → 🟢 GREEN

**Expected:** Automatic fallback to next rider

---

### Scenario 4: 30-Second Overall Timeout

1. Create request → 🟡 YELLOW
2. No riders accept within 30 seconds
3. Request auto-cancelled → 🔴 RED
4. LED shows red on IoT device

**Expected:** Red LED, request cancelled in database

---

### Scenario 5: No Riders Available

1. Create request → 🟡 YELLOW
2. No online riders within 5km
3. Immediate cancellation → 🔴 RED
4. Message: "No riders available"

**Expected:** Immediate red LED, no waiting

---

## 📊 Socket.io Events (For IoT Devices)

### Subscribe to Booth Status
```javascript
socket.on('booth:SOURCE-BOOTH-01:status', (data) => {
  console.log('LED Color:', data.ledColor); // yellow, green, or red
  console.log('Status:', data.status);
  console.log('Message:', data.message);
  
  // Update OLED display based on ledColor
  if (data.ledColor === 'yellow') {
    // Show yellow LED
  } else if (data.ledColor === 'green') {
    // Show green LED
  } else if (data.ledColor === 'red') {
    // Show red LED
  }
});
```

---

## 🔧 Testing with Custom Data

### Use Different Booths
```bash
npm run test:booth SOURCE-BOOTH-02 DEST-03
```

### Use Different Rider
```bash
npm run test:rider RIDER-002 22.4680 91.9750
```

### Create Multiple Requests
```bash
# Terminal 1
npm run test:booth SOURCE-BOOTH-01 DEST-01

# Terminal 2 (after 2 seconds)
npm run test:booth SOURCE-BOOTH-02 DEST-02

# Terminal 3 (after 2 seconds)
npm run test:booth SOURCE-BOOTH-03 DEST-03
```

---

## 🐛 Common Issues

### Issue: "No riders available" (Immediate Red)
**Solution:** Make sure a rider is online first
```bash
# First, make rider online
npm run test:rider

# Then create request
npm run test:booth
```

---

### Issue: Request times out (30s Red)
**Cause:** No riders nearby or all riders rejected
**Solution:** 
1. Check rider location is within 5km of booth
2. Make sure rider status is 'online'
3. Check rider is connected via socket

---

### Issue: Rider doesn't receive offers
**Solution:**
1. Ensure rider called `rider:connect` event via socket
2. Check rider's `socketId` is not null in database
3. Verify rider status is 'online' not 'offline' or 'onride'

---

## 📝 Database Status Values

### Request Status:
- `pending`: Just created, searching for riders
- `offering`: Offer sent to a specific rider (10s timeout)
- `accepted`: Rider accepted, on the way
- `picked_up`: Passenger picked up, en route
- `completed`: Ride finished successfully
- `cancelled`: No rider accepted or timeout

### Rider Status:
- `offline`: Not available
- `online`: Available for rides
- `onride`: Currently on a ride

---

## 🎥 Watch Backend Logs

The backend shows detailed logs:

```
📝 New ride request created: REQ-xxx from SOURCE-BOOTH-01 to DEST-01
🟡 Status: PENDING - Searching for riders...
🔍 Finding candidates for request REQ-xxx
👥 Found 2 online riders nearby
📤 Offering ride REQ-xxx to rider RIDER-001
⏱️  10-second timeout started
🟡 Status: OFFERING - Waiting for rider response...
✅ Rider RIDER-001 accepting offer
🟢 Status: ACCEPTED - Rider is on the way
```

---

## 🎯 Production IoT Integration

### Arduino/ESP32 Example:
```cpp
// Create ride request
String json = "{\"boothId\":\"SOURCE-BOOTH-01\",\"destinationId\":\"DEST-01\"}";
http.POST(json);

// Parse response
String ledColor = response["ledColor"]; // "yellow", "green", or "red"

// Update LED
if (ledColor == "yellow") {
  setLED(YELLOW);
} else if (ledColor == "green") {
  setLED(GREEN);
} else if (ledColor == "red") {
  setLED(RED);
}

// Listen for status updates via WebSocket
socket.on("booth:SOURCE-BOOTH-01:status", updateLED);
```

---

## ✅ Test Checklist

- [ ] Create request returns yellow status
- [ ] Rider receives offer via socket
- [ ] Accept updates booth to green
- [ ] Reject moves to next rider (yellow remains)
- [ ] 10-second timeout moves to next rider
- [ ] 30-second timeout shows red
- [ ] No riders available shows immediate red
- [ ] Complete ride flow (pickup → dropoff)
- [ ] Points calculated correctly
- [ ] Rider back online after dropoff

---

**All tests can be done via curl commands - no frontend required! Perfect for IoT device testing.**
