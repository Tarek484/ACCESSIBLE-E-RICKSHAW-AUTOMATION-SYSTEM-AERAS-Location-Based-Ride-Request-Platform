# 🚀 E-Rickshaw System - Simple Setup (No Docker)

## Prerequisites

1. **Node.js** (v14 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **MongoDB** (v4.4 or higher)
   - Download: https://www.mongodb.com/try/download/community
   - Install with default settings
   - MongoDB will start automatically as a Windows service

## Step-by-Step Setup

### Step 1: Start MongoDB

MongoDB should start automatically after installation. To verify:

```bash
# Check if MongoDB is running
mongosh
# If you see a connection, MongoDB is running. Type 'exit' to quit.
```

If not running, start it:
- Windows: MongoDB runs as a service automatically
- Or manually: Open `C:\Program Files\MongoDB\Server\<version>\bin\mongod.exe`

### Step 2: Backend Setup

```bash
# Navigate to project directory
cd e-rickshaw-system

# Install dependencies
npm install

# Seed the database (creates sample data)
npm run seed

# Start the backend server
npm start
```

You should see:
```
✅ MongoDB Connected
🚀 E-Rickshaw Automation System Started
📡 HTTP Server: http://localhost:5000
```

**Keep this terminal running!**

### Step 3: Admin UI Setup

Open a **new terminal**:

```bash
# Navigate to client directory
cd e-rickshaw-system\client

# Install dependencies
npm install

# Start the React app
npm run dev
```

You should see:
```
VITE ready in XXX ms
Local: http://localhost:3000
```

**Keep this terminal running too!**

### Step 4: Access Admin Dashboard

1. Open browser: http://localhost:3000
2. Login with:
   - **Email**: admin@erickshaw.com
   - **Password**: admin123

## Test the System

### Option A: Run Demo Script

Open a **third terminal**:

```bash
cd e-rickshaw-system
npm run demo
```

This simulates:
- Rider connects via Socket.io
- Booth creates ride request
- Rider accepts offer (after 3 seconds)
- Pickup simulation (after 5 seconds)
- Dropoff simulation (after 10 seconds)

Watch the admin dashboard for live updates!

### Option B: Manual Testing with curl

Create a ride request:
```bash
curl -X POST http://localhost:5000/api/booth/request ^
  -H "Content-Type: application/json" ^
  -d "{\"boothId\":\"BOOTH-001\",\"destinationId\":\"DEST-001\"}"
```

Make a rider online:
```bash
curl -X POST http://localhost:5000/api/rider/heartbeat ^
  -H "Content-Type: application/json" ^
  -d "{\"riderId\":\"RIDER-001\",\"latitude\":12.9716,\"longitude\":77.5946,\"status\":\"online\"}"
```

## What You'll See

### Backend Terminal
- Connection logs
- Request creation logs
- Offer assignment logs
- State transition logs

### Admin Dashboard
- **Dashboard**: Real-time statistics
- **Requests**: All ride requests with status
- **Riders**: Rider list with online status
- **Map**: Interactive map showing booths and riders
- **Points**: Points pending review

## Project Structure

```
e-rickshaw-system/
├── models/              # Database schemas
├── routes/              # API endpoints
├── controllers/         # Business logic
├── utils/               # Helper functions
├── scripts/
│   ├── seed.js         # Database seeding
│   └── demo.js         # Demo simulation
├── server.js           # Main server
├── package.json
└── client/             # React Admin UI
    ├── src/
    │   ├── pages/      # Dashboard, Requests, etc.
    │   ├── components/ # Reusable components
    │   └── api/        # API client
    └── package.json
```

## Available Commands

### Backend
```bash
npm start          # Start server
npm run dev        # Start with auto-reload (nodemon)
npm run seed       # Seed database
npm run demo       # Run demo simulation
```

### Frontend (in client/ directory)
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

## Default Data (After Seed)

### Booths
- BOOTH-001: Central Station
- BOOTH-002: Market Square  
- BOOTH-003: Tech Park Gate
- DEST-001: City Hospital
- DEST-002: Shopping Mall
- DEST-003: University Campus

### Riders
- RIDER-001: Rajesh Kumar
- RIDER-002: Amit Sharma
- RIDER-003: Suresh Patil
- RIDER-004: Vijay Singh
- RIDER-005: Ramesh Verma

### Admin
- Email: admin@erickshaw.com
- Password: admin123

## Troubleshooting

### "Cannot connect to MongoDB"
- Make sure MongoDB is installed
- Check if mongod.exe is running in Task Manager
- Try restarting MongoDB service:
  - Press Win+R, type `services.msc`
  - Find "MongoDB Server"
  - Right-click → Restart

### "Port 5000 already in use"
```bash
# Kill process on port 5000
npx kill-port 5000
```

### "Module not found"
```bash
# Reinstall dependencies
npm install
cd client && npm install
```

### Clear Everything and Restart
```bash
# Stop all terminals (Ctrl+C)

# In MongoDB shell
mongosh
use erickshaw
db.dropDatabase()
exit

# Re-seed
npm run seed

# Restart backend
npm start

# Restart frontend (new terminal)
cd client
npm run dev
```

## Ports Used

- **5000**: Backend HTTP & Socket.io server
- **3000**: React Admin UI
- **27017**: MongoDB (default)

Make sure these ports are not used by other applications.

## Next Steps

1. ✅ Explore the admin dashboard
2. ✅ Run the demo script
3. ✅ Try manual curl commands
4. ✅ Watch live updates on the map
5. ✅ Test the complete ride flow

## Success Checklist

- [ ] MongoDB is running
- [ ] Backend started (port 5000)
- [ ] Admin UI started (port 3000)
- [ ] Can login to dashboard
- [ ] Can see statistics
- [ ] Map shows booths and riders
- [ ] Demo script runs successfully

## Need Help?

Check these files:
- `README.md` - Full documentation
- `GETTING_STARTED.md` - Detailed setup guide
- `.env` - Configuration (already created)

---

**You're all set! 🎉**

Open http://localhost:3000 and start exploring!
