# E-Rickshaw Automation System

A complete backend and admin UI system for managing accessible e-rickshaw rides with real-time offer assignment, geospatial queries, and points-based rider incentives.

## 🚀 Features

- **Real-time Ride Assignment**: Socket.io-based offer system with 30-second TTL
- **Geospatial Queries**: MongoDB 2dsphere indexes for proximity-based rider selection
- **Points System**: Automatic points calculation with admin review for long-distance rides
- **Admin Dashboard**: Real-time monitoring, analytics, and manual controls
- **Atomic Operations**: Race-condition-free state transitions using `findOneAndUpdate`
- **Background Workers**: Automatic offer expiry detection and reassignment

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

### Backend Setup

1. Clone the repository and navigate to the project directory:
```bash
cd e-rickshaw-system
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
MONGO_URI=mongodb://localhost:27017/erickshaw
JWT_SECRET=your_super_secret_jwt_key_change_in_production
PORT=5000
NODE_ENV=development
ADMIN_EMAIL=admin@erickshaw.com
ADMIN_PASSWORD=admin123
```

5. Seed the database:
```bash
npm run seed
```

6. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## 📡 API Endpoints

### Booth Routes

#### Create Ride Request
```bash
POST /api/booth/request
Content-Type: application/json

{
  "boothId": "BOOTH-001",
  "destinationId": "DEST-001"
}
```

Example with curl:
```bash
curl -X POST http://localhost:5000/api/booth/request ^
  -H "Content-Type: application/json" ^
  -d "{\"boothId\":\"BOOTH-001\",\"destinationId\":\"DEST-001\"}"
```

### Rider Routes

#### Heartbeat (Update Location)
```bash
POST /api/rider/heartbeat
Content-Type: application/json

{
  "riderId": "RIDER-001",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "status": "online",
  "socketId": "socket-id-here"
}
```

Example with curl:
```bash
curl -X POST http://localhost:5000/api/rider/heartbeat ^
  -H "Content-Type: application/json" ^
  -d "{\"riderId\":\"RIDER-001\",\"latitude\":12.9716,\"longitude\":77.5946,\"status\":\"online\"}"
```

#### Accept Offer
```bash
POST /api/rider/accept
Content-Type: application/json

{
  "requestId": "REQ-...",
  "riderId": "RIDER-001"
}
```

#### Reject Offer
```bash
POST /api/rider/reject
Content-Type: application/json

{
  "requestId": "REQ-...",
  "riderId": "RIDER-001"
}
```

#### Mark Pickup
```bash
POST /api/rider/pickup
Content-Type: application/json

{
  "requestId": "REQ-...",
  "riderId": "RIDER-001"
}
```

#### Mark Dropoff
```bash
POST /api/rider/dropoff
Content-Type: application/json

{
  "requestId": "REQ-...",
  "riderId": "RIDER-001"
}
```

### Admin Routes

#### Login
```bash
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@erickshaw.com",
  "password": "admin123"
}
```

#### Get Dashboard Stats (requires auth)
```bash
GET /api/admin/dashboard
Authorization: Bearer <token>
```

#### List Requests (requires auth)
```bash
GET /api/admin/requests?page=1&limit=20&status=pending
Authorization: Bearer <token>
```

#### List Riders (requires auth)
```bash
GET /api/admin/riders?page=1&limit=20&status=online
Authorization: Bearer <token>
```

## 🔌 Socket.io Events

### Client → Server

- `rider:connect` - Rider identifies and goes online
  ```javascript
  socket.emit('rider:connect', { riderId: 'RIDER-001' });
  ```

- `rider:location:update` - Rider updates location
  ```javascript
  socket.emit('rider:location:update', {
    riderId: 'RIDER-001',
    latitude: 12.9716,
    longitude: 77.5946
  });
  ```

- `offer_response` - Rider responds to offer
  ```javascript
  socket.emit('offer_response', {
    requestId: 'REQ-...',
    riderId: 'RIDER-001',
    accepted: true
  });
  ```

### Server → Client

- `connected` - Connection confirmation
- `offer` - New ride offer (30-second TTL)
- `offer_accepted` - Offer acceptance confirmation
- `request:created` - New request created (admin)
- `request:updated` - Request status updated (admin)
- `rider:status:changed` - Rider status changed (admin)
- `rider:location:updated` - Rider location updated (admin)
- `ride:completed` - Ride completed (admin)

## 🎬 Running the Demo

The demo script simulates a complete ride flow:

```bash
npm run demo
```

This will:
1. Connect a mock rider (RIDER-001) via Socket.io
2. Create a ride request from BOOTH-001 to DEST-001
3. Automatically accept the offer after 3 seconds
4. Simulate pickup after 5 seconds
5. Simulate dropoff after 10 seconds
6. Show complete state transitions with logs

## 🏗️ Project Structure

```
e-rickshaw-system/
├── models/
│   ├── AdminUser.js           # Admin user model
│   ├── Booth.js               # Booth/station model
│   ├── Rider.js               # Rider model with geospatial index
│   ├── RideRequest.js         # Ride request with offer tracking
│   ├── RideLog.js             # Completed ride log
│   └── PointPendingReview.js  # Points pending admin review
├── routes/
│   ├── admin.routes.js        # Admin endpoints
│   ├── booth.routes.js        # Booth endpoints
│   └── rider.routes.js        # Rider endpoints
├── controllers/
│   └── requestsController.js  # Core ride assignment logic
├── utils/
│   ├── auth.js                # JWT authentication
│   ├── db.js                  # MongoDB connection
│   ├── geo.js                 # Haversine distance calculation
│   └── points.js              # Points calculation
├── scripts/
│   ├── seed.js                # Database seeding
│   └── demo.js                # Demo script
├── server.js                  # Main server file
├── package.json
├── .env.example
└── README.md
```

## 🧮 Points Calculation

Points are calculated using the formula:
```
BasePoints = 10
DistancePoints = distanceMeters / 10
FinalPoints = BasePoints + DistancePoints
```

- Rides ≤ 100m: Points auto-approved
- Rides > 100m: Points pending admin review

## 🔄 Offer Assignment Algorithm

1. Find online riders within 5km using geospatial query
2. Sort by: distance (asc) → acceptedRides (asc) → pointsBalance (desc)
3. Offer to first candidate with 30-second TTL
4. If accepted: Mark request accepted, rider goes "onride"
5. If rejected/expired: Record attempt, offer to next candidate
6. Background worker checks for expired offers every 5 seconds

## 🐳 Docker Compose (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://mongodb:27017/erickshaw
      - JWT_SECRET=your_secret_key
      - PORT=5000
    depends_on:
      - mongodb

volumes:
  mongo-data:
```

Run with:
```bash
docker-compose up
```

## 📊 Database Indexes

The system automatically creates the following indexes:

- `Rider.location`: 2dsphere (geospatial queries)
- `Booth.location`: 2dsphere (geospatial queries)
- `RideRequest.status + createdAt`: Compound index
- `RideRequest.offerExpiresAt`: TTL queries
- `Rider.status`: Status filtering

## 🔐 Security

- JWT-based admin authentication
- Password hashing with bcrypt (10 rounds)
- Input validation on all endpoints
- CORS enabled for cross-origin requests
- No sensitive data in logs

## 🧪 Testing

### Manual Testing with curl

Test complete flow:

```bash
# 1. Create request
curl -X POST http://localhost:5000/api/booth/request ^
  -H "Content-Type: application/json" ^
  -d "{\"boothId\":\"BOOTH-001\",\"destinationId\":\"DEST-001\"}"

# 2. Update rider location
curl -X POST http://localhost:5000/api/rider/heartbeat ^
  -H "Content-Type: application/json" ^
  -d "{\"riderId\":\"RIDER-001\",\"latitude\":12.9716,\"longitude\":77.5946,\"status\":\"online\"}"

# 3. Accept offer (use requestId from step 1)
curl -X POST http://localhost:5000/api/rider/accept ^
  -H "Content-Type: application/json" ^
  -d "{\"requestId\":\"REQ-xxx\",\"riderId\":\"RIDER-001\"}"

# 4. Mark pickup
curl -X POST http://localhost:5000/api/rider/pickup ^
  -H "Content-Type: application/json" ^
  -d "{\"requestId\":\"REQ-xxx\",\"riderId\":\"RIDER-001\"}"

# 5. Mark dropoff
curl -X POST http://localhost:5000/api/rider/dropoff ^
  -H "Content-Type: application/json" ^
  -d "{\"requestId\":\"REQ-xxx\",\"riderId\":\"RIDER-001\"}"
```

## 📝 Default Credentials

After running `npm run seed`:

**Admin:**
- Email: admin@erickshaw.com
- Password: admin123

**Booths:**
- BOOTH-001: Central Station
- BOOTH-002: Market Square
- BOOTH-003: Tech Park Gate
- DEST-001: City Hospital
- DEST-002: Shopping Mall
- DEST-003: University Campus

**Riders:**
- RIDER-001: Rajesh Kumar
- RIDER-002: Amit Sharma
- RIDER-003: Suresh Patil
- RIDER-004: Vijay Singh
- RIDER-005: Ramesh Verma

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod` or check service status
- Verify MONGO_URI in `.env` file
- Check firewall settings

### Socket.io Connection Issues
- Verify PORT matches in client and server
- Check CORS settings in `server.js`
- Use websocket transport explicitly

### Offer Not Received
- Ensure rider is connected via socket (`rider:connect` event)
- Check rider status is 'online'
- Verify rider is within 5km of booth location

## 📄 License

MIT

## 👥 Contributors

System Administrator

---

For more information or support, contact: admin@erickshaw.com
