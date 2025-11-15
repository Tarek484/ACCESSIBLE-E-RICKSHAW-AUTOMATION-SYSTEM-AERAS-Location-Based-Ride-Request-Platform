# 🎯 Quick API Reference for IoT Testing

## Status Flow
```
CREATE REQUEST → 🟡 PENDING → 🟡 OFFERING → 🟢 ACCEPTED → PICKED_UP → COMPLETED
                            ↘ (10s/rider timeout) → Try next rider
                            ↘ (30s overall timeout) → 🔴 CANCELLED
```

## LED Colors
- **🟡 YELLOW**: Searching / Waiting (show on OLED during search)
- **🟢 GREEN**: Rider accepted (show on OLED when rider coming)
- **🔴 RED**: Cancelled / Failed (show on OLED when no riders)

---

## Essential API Endpoints

### 1. Create Ride Request (Booth/IoT Device)
```bash
POST http://localhost:5000/api/booth/request
Body: { "boothId": "SOURCE-BOOTH-01", "destinationId": "DEST-01" }
Returns: { ledColor: "yellow", status: "pending", requestId: "REQ-xxx" }
```

### 2. Make Rider Online
```bash
POST http://localhost:5000/api/rider/heartbeat
Body: { "riderId": "RIDER-001", "latitude": 22.4625, "longitude": 91.9692, "status": "online" }
```

### 3. Accept Offer
```bash
POST http://localhost:5000/api/rider/accept
Body: { "requestId": "REQ-xxx", "riderId": "RIDER-001" }
```

### 4. Reject Offer
```bash
POST http://localhost:5000/api/rider/reject
Body: { "requestId": "REQ-xxx", "riderId": "RIDER-001" }
```

### 5. Mark Pickup
```bash
POST http://localhost:5000/api/rider/pickup
Body: { "requestId": "REQ-xxx", "riderId": "RIDER-001" }
```

### 6. Mark Dropoff
```bash
POST http://localhost:5000/api/rider/dropoff
Body: { "requestId": "REQ-xxx", "riderId": "RIDER-001" }
```

---

## Quick Test Commands

### Start Backend
```bash
npm start
```

### Seed Database
```bash
npm run seed
```

### Test Complete Flow (Automated)
```bash
# Terminal 1: Backend
npm start

# Terminal 2: Rider (auto-accepts)
npm run test:rider

# Terminal 3: Booth request
npm run test:booth
```

---

## Socket.io Events for IoT

### Listen for Status Updates
```javascript
socket.on('booth:SOURCE-BOOTH-01:status', (data) => {
  // data.ledColor: "yellow", "green", or "red"
  // data.status: "pending", "offering", "accepted", "cancelled"
  // data.message: Human-readable message
});
```

---

## Database Collections

### Booths
- `SOURCE-BOOTH-01`, `SOURCE-BOOTH-02`, `SOURCE-BOOTH-03` (all at CUET)
- `DEST-01`, `DEST-02`, `DEST-03` (different locations)

### Riders
- `RIDER-001`, `RIDER-002`, `RIDER-003`, `RIDER-004`, `RIDER-005`

### Admin
- Email: admin@erickshaw.com
- Password: admin123

---

## Timeouts

- **10 seconds**: Per rider offer timeout
- **30 seconds**: Overall request timeout
- After 10s: Auto-move to next available rider
- After 30s: Auto-cancel with red LED

---

## Typical Response Times

- Request creation: Immediate
- Rider search: < 1 second
- Offer to rider: Immediate
- Green LED update: When accepted (< 10s)
- Red LED update: When cancelled (10-30s depending on scenario)

---

## Test Scenarios Summary

| Scenario | Result | LED Color | Time |
|----------|--------|-----------|------|
| Rider accepts | Success | 🟢 Green | < 10s |
| Rider rejects | Try next | 🟡 Yellow | continues |
| No response | Try next | 🟡 Yellow | 10s per rider |
| All reject/timeout | Cancelled | 🔴 Red | Max 30s |
| No riders | Cancelled | 🔴 Red | Immediate |

---

## Admin Dashboard
Access: http://localhost:3000
- View live requests
- Monitor riders
- See map with locations
- Review points

---

## Ports
- Backend: 5000
- Admin UI: 3000
- MongoDB: 27017 (cloud)

---

**Ready for IoT integration! All endpoints tested and working.**
