# E-Rickshaw Admin UI

React-based admin dashboard for the E-Rickshaw Automation System.

## 🚀 Features

- **Live Dashboard**: Real-time statistics with Socket.io updates
- **Request Management**: View all ride requests with offer attempt timelines
- **Rider Monitoring**: Track rider status, points, and performance
- **Live Map**: Interactive Leaflet map showing booths and online riders
- **Points Review**: Approve or reject points for rides > 100m

## 📋 Prerequisites

- Node.js (v14 or higher)
- Backend server running on http://localhost:5000

## 🛠️ Installation

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The admin UI will be available at http://localhost:3000

## 🔐 Default Login

After seeding the database:
- **Email**: admin@erickshaw.com
- **Password**: admin123

## 📱 Pages

### Dashboard
- Live statistics cards
- Rider counts (online, offline, on ride)
- Request counts (pending, completed)
- Pending points review count

### Requests
- List of all ride requests
- Filter by status
- View offer attempt timeline
- Cancel pending requests

### Riders
- List of all riders
- Filter by status
- View points balance and statistics
- Real-time location updates

### Map
- Interactive map with Leaflet
- Booth markers with 5km radius circles
- Online riders (green markers)
- On-ride riders (orange markers)
- Real-time position updates

### Points
- Review pending points (rides > 100m)
- Approve or reject points
- View points calculation formula

## 🔌 Real-time Updates

The UI automatically subscribes to Socket.io events:
- `request:created` - New request notification
- `request:updated` - Request status changes
- `rider:status:changed` - Rider online/offline status
- `rider:location:updated` - Rider GPS updates
- `ride:completed` - Ride completion notification

## 🏗️ Project Structure

```
client/
├── src/
│   ├── api/
│   │   └── index.js          # Axios API client
│   ├── socket/
│   │   └── index.js          # Socket.io client
│   ├── pages/
│   │   ├── Login.jsx         # Login page
│   │   ├── Dashboard.jsx     # Dashboard
│   │   ├── Requests.jsx      # Requests list
│   │   ├── Riders.jsx        # Riders list
│   │   ├── MapView.jsx       # Live map
│   │   └── Points.jsx        # Points review
│   ├── components/
│   │   └── Layout.jsx        # Main layout with sidebar
│   ├── App.jsx               # Main app component
│   ├── App.css               # Global styles
│   └── main.jsx              # Entry point
├── index.html
├── package.json
└── vite.config.js
```

## 🎨 UI Components

### Stat Cards
Display key metrics with color-coded values

### Tables
Sortable, filterable data tables with status badges

### Status Badges
Color-coded status indicators:
- 🟢 Online/Accepted/Completed (green)
- 🟠 On Ride/Picked Up (orange)
- 🟡 Pending/Offering (yellow)
- 🔴 Offline/Cancelled (red)

### Timeline
Visual timeline for offer attempts with responses

## 🔧 Configuration

Create `.env` file in client directory (optional):
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 📦 Build for Production

```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## 🐛 Troubleshooting

### Backend Connection Issues
- Ensure backend is running on http://localhost:5000
- Check CORS settings in backend server.js
- Verify proxy settings in vite.config.js

### Socket.io Not Connecting
- Check VITE_SOCKET_URL in .env
- Verify backend Socket.io port
- Check browser console for connection errors

### Map Not Loading
- Ensure Leaflet CSS is loaded in index.html
- Check internet connection (OSM tiles)
- Verify coordinates are valid

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Check JWT_SECRET matches backend
- Verify admin user exists in database

## 📄 License

MIT
