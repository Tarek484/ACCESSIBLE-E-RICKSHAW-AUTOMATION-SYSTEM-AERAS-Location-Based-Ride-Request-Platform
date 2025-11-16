# E-Rickshaw Automation System - Quick Start Guide

## 🚀 Complete Setup Instructions

### Step 1: Backend Setup

1. **Install MongoDB** (if not already installed)
   - Download from https://www.mongodb.com/try/download/community
   - Or use Docker: `docker run -d -p 27017:27017 --name mongodb mongo:latest`

2. **Navigate to project directory**
   ```bash
   cd e-rickshaw-system
   ```

3. **Install backend dependencies**
   ```bash
   npm install
   ```

4. **Verify .env file exists**
   The `.env` file should already be created with default values. Edit if needed:
   ```
   MONGO_URI=mongodb://localhost:27017/erickshaw
   JWT_SECRET=erickshaw_super_secret_key_2025_change_in_production
   PORT=5000
   NODE_ENV=development
   ADMIN_EMAIL=admin@erickshaw.com
   ADMIN_PASSWORD=admin123
   ```

5. **Seed the database**
   ```bash
   npm run seed
   ```
   
   This creates:
   - 6 booths (3 sources + 3 destinations)
   - 5 riders with locations
   - 1 admin user (admin@erickshaw.com / admin123)

6. **Start the backend server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

   The server will be running at:
   - HTTP: http://localhost:5000
   - Socket.io: ws://localhost:5000

### Step 2: Admin UI Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install client dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   The admin UI will be available at: http://localhost:3000

4. **Login to admin dashboard**
   - Email: admin@erickshaw.com
   - Password: admin123

### Step 3: Run Demo

1. **Open a new terminal** (keep backend and client running)

2. **Navigate to project root**
   ```bash
   cd e-rickshaw-system
   ```

3. **Run the demo script**
   ```bash
   npm run demo
   ```

   The demo will:
   - Connect a mock rider (RIDER-001)
   - Create a ride request
   - Automatically accept after 3 seconds
   - Simulate pickup after 5 seconds
   - Simulate dropoff after 10 seconds
   - Show complete state transitions

## 📡 Testing with curl

### Create a ride request (simulate booth)
```bash
curl -X POST http://localhost:5000/api/booth/request ^
  -H "Content-Type: application/json" ^
  -d "{\"boothId\":\"BOOTH-001\",\"destinationId\":\"DEST-001\"}"
```

### Update rider location (heartbeat)
```bash
curl -X POST http://localhost:5000/api/rider/heartbeat ^
  -H "Content-Type: application/json" ^
  -d "{\"riderId\":\"RIDER-001\",\"latitude\":12.9716,\"longitude\":77.5946,\"status\":\"online\"}"
```

### Accept offer (use requestId from previous request)
```bash
curl -X POST http://localhost:5000/api/rider/accept ^
  -H "Content-Type: application/json" ^
  -d "{\"requestId\":\"REQ-xxx\",\"riderId\":\"RIDER-001\"}"
```

### Mark pickup
```bash
curl -X POST http://localhost:5000/api/rider/pickup ^
  -H "Content-Type: application/json" ^
  -d "{\"requestId\":\"REQ-xxx\",\"riderId\":\"RIDER-001\"}"
```

### Mark dropoff
```bash
curl -X POST http://localhost:5000/api/rider/dropoff ^
  -H "Content-Type: application/json" ^
  -d "{\"requestId\":\"REQ-xxx\",\"riderId\":\"RIDER-001\"}"
```

## 🐳 Docker Setup (Optional)

1. **Build and start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Seed the database** (after containers are running)
   ```bash
   docker exec -it erickshaw-backend npm run seed
   ```

3. **View logs**
   ```bash
   docker-compose logs -f backend
   ```

4. **Stop containers**
   ```bash
   docker-compose down
   ```

## 🎯 Key Features Implemented

### Backend
✅ Ride request creation from booths
✅ Geospatial proximity search (2dsphere indexes)
✅ Offer assignment with 30-second TTL
✅ Atomic state transitions with findOneAndUpdate
✅ Background worker for offer expiry
✅ Points calculation (BasePoints + DistancePoints)
✅ Auto-approve points ≤ 100m, manual review > 100m
✅ JWT authentication for admin
✅ Socket.io real-time updates
✅ Complete ride lifecycle (request → offer → accept → pickup → dropoff)

### Admin UI
✅ Real-time dashboard with statistics
✅ Request management with offer timeline
✅ Rider monitoring with status tracking
✅ Live map with Leaflet (booths + riders)
✅ Points review and approval system
✅ Socket.io integration for live updates
✅ Responsive design with modern UI

## 📊 System Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Booth     │────────▶│   Backend    │◀────────│   Rider     │
│  (Hardware) │  HTTP   │   Server     │ Socket  │   Mobile    │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               │ Socket.io
                               ▼
                        ┌──────────────┐
                        │  Admin UI    │
                        │  (React)     │
                        └──────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   MongoDB    │
                        └──────────────┘
```

## 🔄 Offer Assignment Flow

1. Booth creates ride request (HTTP POST)
2. Backend finds online riders within 5km radius
3. Sorts by: distance (asc) → acceptedRides (asc) → pointsBalance (desc)
4. Offers to first candidate via Socket.io
5. Sets 30-second expiry timer
6. If accepted: Mark rider "onride", request "accepted"
7. If rejected/expired: Record attempt, offer to next candidate
8. Background worker checks for expired offers every 5 seconds

## 📝 Data Models

- **Booth**: Location (2dsphere), name, address
- **Rider**: Location (2dsphere), status, points, stats
- **RideRequest**: Source/dest, status, offerAttempts[], assignedRider
- **RideLog**: Completed ride data, distance, points
- **PointPendingReview**: Rides > 100m requiring approval
- **AdminUser**: Email, password (bcrypt), role

## 🔐 Security Features

- JWT authentication with 30-day expiry
- Password hashing (bcrypt, 10 rounds)
- Input validation on all endpoints
- Auth middleware for protected routes
- CORS enabled for cross-origin requests

## 📈 Performance Optimizations

- MongoDB 2dsphere geospatial indexes
- Compound indexes on status + createdAt
- Atomic updates with findOneAndUpdate
- Background worker for async processing
- Connection pooling with Mongoose

## 🐛 Common Issues & Solutions

### "Cannot connect to MongoDB"
- Ensure MongoDB is running: `mongod` or check service
- Verify MONGO_URI in .env file
- Check port 27017 is not in use

### "Socket.io connection failed"
- Verify backend is running on port 5000
- Check CORS settings in server.js
- Use websocket transport explicitly

### "No riders receiving offers"
- Ensure rider status is 'online'
- Check rider has valid socketId
- Verify rider is within 5km of booth

### "Admin login fails"
- Run `npm run seed` to create admin user
- Check credentials match .env values
- Clear browser localStorage

## 📞 Support

For issues or questions:
- Check the main README.md
- Review server console logs
- Check browser console for client errors
- Verify database connection and indexes

## ✅ Verification Checklist

Before demo:
- [ ] MongoDB is running
- [ ] Backend server started (npm start)
- [ ] Admin UI started (cd client && npm run dev)
- [ ] Database seeded (npm run seed)
- [ ] Can login to admin dashboard
- [ ] Can see booths on map
- [ ] Demo script runs successfully

## 🎉 Success!

Your E-Rickshaw Automation System is now running!

- Backend: http://localhost:5000
- Admin UI: http://localhost:3000
- Socket.io: ws://localhost:5000

Login to the admin dashboard to monitor live operations.
