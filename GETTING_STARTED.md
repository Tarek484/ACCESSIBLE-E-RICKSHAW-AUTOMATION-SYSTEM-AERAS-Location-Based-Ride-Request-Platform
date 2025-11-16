# 🚀 GETTING STARTED - E-Rickshaw Automation System

## ⚡ Quick Start (3 Simple Steps)

### Step 1: Install Dependencies & Seed Database
```bash
# Install backend dependencies
npm install

# Seed the database (creates booths, riders, and admin user)
npm run seed
```

### Step 2: Start Backend Server
```bash
# Start server (in one terminal)
npm start
```
Server will run at http://localhost:5000

### Step 3: Start Admin UI
```bash
# Open a new terminal, navigate to client folder
cd client

# Install client dependencies
npm install

# Start the React app
npm run dev
```
Admin UI will open at http://localhost:3000

**Login Credentials:**
- Email: `admin@erickshaw.com`
- Password: `admin123`

---

## 🎬 Run the Demo

After backend is running, open another terminal:

```bash
npm run demo
```

This simulates a complete ride flow:
1. Connects a mock rider via Socket.io
2. Creates a ride request from a booth
3. Rider accepts the offer automatically
4. Simulates pickup and dropoff
5. Shows all state transitions with logs

---

## 📋 Prerequisites

### Required Software
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)

### Install MongoDB on Windows
1. Download MongoDB Community Server
2. Run installer with default settings
3. MongoDB will start automatically as a service

**Or use Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

---

## 🏗️ Complete Project Structure

```
e-rickshaw-system/
├── 📁 models/              # Mongoose schemas
│   ├── AdminUser.js
│   ├── Booth.js
│   ├── Rider.js
│   ├── RideRequest.js
│   ├── RideLog.js
│   └── PointPendingReview.js
├── 📁 routes/              # Express routes
│   ├── admin.routes.js
│   ├── booth.routes.js
│   └── rider.routes.js
├── 📁 controllers/         # Business logic
│   └── requestsController.js
├── 📁 utils/               # Utilities
│   ├── auth.js            # JWT helpers
│   ├── db.js              # MongoDB connection
│   ├── geo.js             # Distance calculation
│   └── points.js          # Points formula
├── 📁 scripts/             # Helper scripts
│   ├── seed.js            # Database seeding
│   └── demo.js            # Demo simulation
├── 📁 client/              # React Admin UI
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # React components
│   │   ├── api/           # API client
│   │   └── socket/        # Socket.io client
│   ├── package.json
│   └── vite.config.js
├── server.js               # Main server file
├── package.json
├── .env                    # Environment variables
├── docker-compose.yml      # Docker setup
├── README.md               # Full documentation
├── QUICKSTART.md           # Quick start guide
└── GETTING_STARTED.md      # This file
```

---

## 📡 Available Endpoints

### Booth Endpoints
```
POST /api/booth/request
Body: { "boothId": "BOOTH-001", "destinationId": "DEST-001" }
```

### Rider Endpoints
```
POST /api/rider/heartbeat
POST /api/rider/accept
POST /api/rider/reject
POST /api/rider/pickup
POST /api/rider/dropoff
GET  /api/rider/:riderId
```

### Admin Endpoints (require JWT token)
```
POST /api/admin/login
GET  /api/admin/dashboard
GET  /api/admin/requests
GET  /api/admin/riders
GET  /api/admin/booths
GET  /api/admin/points/pending
POST /api/admin/points/approve
POST /api/admin/points/reject
POST /api/admin/request/cancel
GET  /api/admin/analytics
```

---

## 🧪 Testing the System

### Test 1: Create a ride request
```bash
curl -X POST http://localhost:5000/api/booth/request ^
  -H "Content-Type: application/json" ^
  -d "{\"boothId\":\"BOOTH-001\",\"destinationId\":\"DEST-001\"}"
```

### Test 2: Make a rider online
```bash
curl -X POST http://localhost:5000/api/rider/heartbeat ^
  -H "Content-Type: application/json" ^
  -d "{\"riderId\":\"RIDER-001\",\"latitude\":12.9716,\"longitude\":77.5946,\"status\":\"online\"}"
```

### Test 3: Check admin dashboard
1. Login to http://localhost:3000
2. View real-time statistics
3. Watch requests page for live updates

---

## 🎯 System Flow

### Complete Ride Lifecycle

```
1. BOOTH CREATES REQUEST
   POST /api/booth/request
   ↓
2. BACKEND FINDS NEARBY RIDERS
   - Geospatial query (2dsphere)
   - Within 5km radius
   - Status: online
   ↓
3. OFFER TO BEST CANDIDATE
   - Sort by: distance, acceptedRides, points
   - Send via Socket.io
   - 30-second expiry
   ↓
4. RIDER ACCEPTS
   POST /api/rider/accept
   - Rider status → "onride"
   - Request status → "accepted"
   ↓
5. PICKUP PASSENGER
   POST /api/rider/pickup
   - Request status → "picked_up"
   ↓
6. DROPOFF PASSENGER
   POST /api/rider/dropoff
   - Calculate distance (Haversine)
   - Calculate points (Base + Distance/10)
   - Create RideLog
   - If distance > 100m → Pending Review
   - If distance ≤ 100m → Auto-approve
   - Rider status → "online"
   - Request status → "completed"
```

---

## 🔧 Environment Variables

The `.env` file is already configured with defaults:

```env
MONGO_URI=mongodb://localhost:27017/erickshaw
JWT_SECRET=erickshaw_super_secret_key_2025_change_in_production
PORT=5000
NODE_ENV=development
ADMIN_EMAIL=admin@erickshaw.com
ADMIN_PASSWORD=admin123
```

**Change these in production!**

---

## 📊 Database Collections

After seeding, you'll have:

### Booths (6 total)
- **Source Booths**: BOOTH-001, BOOTH-002, BOOTH-003
- **Destinations**: DEST-001, DEST-002, DEST-003

### Riders (5 total)
- RIDER-001: Rajesh Kumar
- RIDER-002: Amit Sharma
- RIDER-003: Suresh Patil
- RIDER-004: Vijay Singh
- RIDER-005: Ramesh Verma

### Admin User (1)
- Email: admin@erickshaw.com
- Password: admin123

---

## 🔌 Socket.io Events

### Client → Server
- `rider:connect` - Rider goes online
- `rider:location:update` - Update GPS location
- `offer_response` - Respond to ride offer

### Server → Client
- `connected` - Connection confirmed
- `offer` - New ride offer (riders)
- `request:created` - New request (admin)
- `request:updated` - Request updated (admin)
- `rider:status:changed` - Rider status changed (admin)
- `rider:location:updated` - Rider moved (admin)
- `ride:completed` - Ride finished (admin)

---

## 🗺️ Admin UI Features

### Dashboard Page
- Total riders, online, offline, on ride
- Total requests, pending, completed
- Pending points review count

### Requests Page
- All ride requests with filters
- Offer attempt timeline
- Cancel pending requests
- Real-time updates

### Riders Page
- All riders with status
- Points balance and stats
- Last seen timestamp
- Real-time status changes

### Map Page
- Leaflet interactive map
- Blue markers: Booths (with 5km radius)
- Green markers: Online riders
- Orange markers: On-ride riders
- Real-time position updates

### Points Page
- Pending reviews (rides > 100m)
- Approve/reject with notes
- Points calculation formula

---

## 🐳 Docker Alternative

Instead of local installation, use Docker:

```bash
# Start MongoDB + Backend
docker-compose up -d

# Seed database
docker exec -it erickshaw-backend npm run seed

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down
```

---

## ✅ Verification Checklist

Before presenting/demoing:

- [ ] MongoDB is running (check with `mongo` or MongoDB Compass)
- [ ] Backend server started successfully
- [ ] No errors in backend console
- [ ] Admin UI running on port 3000
- [ ] Database seeded with sample data
- [ ] Can login to admin dashboard
- [ ] Can see statistics on dashboard
- [ ] Can see booths on map
- [ ] Demo script runs without errors

---

## 🐛 Troubleshooting

### MongoDB Connection Error
**Problem**: "Error connecting to MongoDB"
**Solution**: 
1. Check if MongoDB is running: `mongod` or check Windows Services
2. Verify port 27017 is available
3. Check MONGO_URI in .env file

### Port Already in Use
**Problem**: "EADDRINUSE: address already in use :::5000"
**Solution**:
1. Kill process on port 5000: `npx kill-port 5000`
2. Or change PORT in .env file

### Socket.io Not Connecting
**Problem**: "Socket connection failed"
**Solution**:
1. Verify backend is running
2. Check browser console for errors
3. Ensure CORS is enabled in server.js

### No Offers Being Sent
**Problem**: Rider not receiving offers
**Solution**:
1. Ensure rider status is 'online'
2. Check rider is within 5km of booth
3. Verify rider has valid socketId
4. Check backend logs for errors

### Admin Login Fails
**Problem**: "Invalid credentials"
**Solution**:
1. Re-run `npm run seed`
2. Check credentials match .env
3. Clear browser localStorage: `localStorage.clear()`

---

## 📞 Need Help?

1. Check the main **README.md** for detailed documentation
2. Review **QUICKSTART.md** for step-by-step setup
3. Check server console logs for backend errors
4. Check browser console for client errors
5. Verify all prerequisites are installed

---

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ Backend logs show "MongoDB Connected"
2. ✅ Backend logs show "E-Rickshaw Automation System Started"
3. ✅ Admin UI loads without errors
4. ✅ Can login with admin credentials
5. ✅ Dashboard shows statistics (even if all zeros)
6. ✅ Map page displays with markers
7. ✅ Demo script completes successfully

---

## 📚 Next Steps

1. **Explore the Admin UI**
   - View dashboard statistics
   - Check requests and riders
   - Explore the live map

2. **Run the Demo**
   - `npm run demo`
   - Watch console logs for state transitions
   - See real-time updates in admin UI

3. **Test Manually**
   - Use curl commands to create requests
   - Connect riders via Socket.io
   - Test complete ride flows

4. **Customize**
   - Add more booths/riders in seed.js
   - Modify points calculation in utils/points.js
   - Adjust offer timeout in controllers/requestsController.js

---

## 🚀 You're All Set!

Your E-Rickshaw Automation System is ready to use. Start the backend, launch the admin UI, and run the demo to see everything in action!

**Happy coding! 🎉**
