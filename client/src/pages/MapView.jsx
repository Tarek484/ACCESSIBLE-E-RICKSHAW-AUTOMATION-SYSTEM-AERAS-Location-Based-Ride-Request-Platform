import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { initSocket } from '../socket';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const boothIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const riderOnlineIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const riderOnRideIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapView() {
  const [booths, setBooths] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [center] = useState([24.8949, 91.8687]); // Sylhet, Bangladesh

  useEffect(() => {
    loadMapData();
    
    // Initialize socket for live updates
    const socket = initSocket();
    
    socket.on('rider:location:updated', ({ riderId, latitude, longitude }) => {
      setRiders(prev => 
        prev.map(rider => 
          rider.riderId === riderId 
            ? { 
                ...rider, 
                location: { 
                  ...rider.location, 
                  coordinates: [longitude, latitude] 
                } 
              } 
            : rider
        )
      );
    });
    
    socket.on('rider:status:changed', ({ riderId, status }) => {
      setRiders(prev => 
        prev.map(rider => 
          rider.riderId === riderId ? { ...rider, status } : rider
        )
      );
    });
    
    // Refresh every 30 seconds
    const interval = setInterval(loadMapData, 30000);
    
    return () => {
      clearInterval(interval);
      socket.off('rider:location:updated');
      socket.off('rider:status:changed');
    };
  }, []);

  const loadMapData = async () => {
    try {
      const [boothsResponse, ridersResponse] = await Promise.all([
        adminAPI.getBooths(),
        adminAPI.getRiders({ status: 'online,onride' })
      ]);
      
      setBooths(boothsResponse.data.booths);
      setRiders(ridersResponse.data.riders);
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading map...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '20px', color: '#1a1a2e' }}>Live Map</h1>
      
      <div className="map-container">
        <div style={{ marginBottom: '15px', display: 'flex', gap: '20px', fontSize: '14px' }}>
          <div>
            <span style={{ color: '#2c7bb6' }}>🔵</span> Booths ({booths.length})
          </div>
          <div>
            <span style={{ color: '#00a900' }}>🟢</span> Online Riders ({riders.filter(r => r.status === 'online').length})
          </div>
          <div>
            <span style={{ color: '#ff8c00' }}>🟠</span> On Ride ({riders.filter(r => r.status === 'onride').length})
          </div>
        </div>
        
        <MapContainer 
          center={center} 
          zoom={13} 
          style={{ height: '600px', borderRadius: '8px' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Render booths */}
          {booths.map(booth => (
            <Marker
              key={booth.boothId}
              position={[booth.location.coordinates[1], booth.location.coordinates[0]]}
              icon={boothIcon}
            >
              <Popup>
                <div>
                  <strong>{booth.name}</strong><br />
                  <small>{booth.boothId}</small><br />
                  <small>{booth.address}</small>
                </div>
              </Popup>
              <Circle
                center={[booth.location.coordinates[1], booth.location.coordinates[0]]}
                radius={5000} // 5km radius
                pathOptions={{ 
                  color: '#2c7bb6', 
                  fillColor: '#2c7bb6', 
                  fillOpacity: 0.05,
                  weight: 1,
                  dashArray: '5, 5'
                }}
              />
            </Marker>
          ))}
          
          {/* Render riders */}
          {riders.map(rider => (
            <Marker
              key={rider.riderId}
              position={[rider.location.coordinates[1], rider.location.coordinates[0]]}
              icon={rider.status === 'onride' ? riderOnRideIcon : riderOnlineIcon}
            >
              <Popup>
                <div>
                  <strong>{rider.name}</strong><br />
                  <small>{rider.riderId}</small><br />
                  <span className={`status-badge status-${rider.status}`}>
                    {rider.status}
                  </span><br />
                  <small>Points: {rider.pointsBalance}</small><br />
                  <small>Completed: {rider.completedRides}</small>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapView;
