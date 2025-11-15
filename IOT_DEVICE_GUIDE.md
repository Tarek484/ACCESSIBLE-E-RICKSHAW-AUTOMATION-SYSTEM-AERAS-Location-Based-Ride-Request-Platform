# IoT Device Connection Guide

## Overview
The E-Rickshaw system now supports **both** Socket.IO (for web/simulators) and **native WebSocket** (for IoT devices like ESP32, Arduino).

## Architecture
```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│ IoT Device  │  WebSocket  │  Bridge Server   │  Socket.IO  │ Web Clients │
│ (ESP32)     │ ──────────> │  (Node.js)       │ ──────────> │ (Dashboard) │
└─────────────┘             └──────────────────┘             └─────────────┘
     ws://localhost:8080          Port: 5000 & 8080          http://localhost:3000
```

## Server Ports
- **HTTP API**: `http://localhost:5000` (REST endpoints)
- **Socket.IO**: `ws://localhost:5000` (Web clients, simulators)
- **WebSocket**: `ws://localhost:8080` (IoT devices: ESP32, Arduino, etc.)

---

## ESP32 / Arduino Connection

### 1. Install WebSocket Library
```cpp
// For Arduino IDE: Install "WebSockets by Markus Sattler"
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
```

### 2. Connection Code
```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// WebSocket server
const char* ws_host = "192.168.1.100";  // Replace with your server IP
const uint16_t ws_port = 8080;

WebSocketsClient webSocket;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  
  // Connect to WebSocket
  webSocket.begin(ws_host, ws_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();
  
  // Send heartbeat every 5 seconds
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 5000) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected");
      break;
      
    case WStype_CONNECTED:
      Serial.println("[WS] Connected");
      // Identify device
      identifyDevice();
      break;
      
    case WStype_TEXT:
      Serial.printf("[WS] Received: %s\n", payload);
      handleMessage((char*)payload);
      break;
  }
}

void identifyDevice() {
  StaticJsonDocument<200> doc;
  doc["type"] = "identify";
  doc["deviceId"] = "RIDER-001";
  doc["deviceType"] = "ESP32-Rider";
  
  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void sendHeartbeat() {
  // Read GPS coordinates (example values)
  float latitude = 22.4625;
  float longitude = 91.9692;
  
  StaticJsonDocument<200> doc;
  doc["type"] = "rider:heartbeat";
  doc["riderId"] = "RIDER-001";
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  
  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
  
  Serial.println("Heartbeat sent");
}

void handleMessage(String message) {
  StaticJsonDocument<512> doc;
  deserializeJson(doc, message);
  
  String type = doc["type"];
  
  if (type == "ride:offer") {
    String requestId = doc["requestId"];
    String pickup = doc["pickup"];
    String destination = doc["destination"];
    
    Serial.println("NEW RIDE OFFER!");
    Serial.println("Request: " + requestId);
    Serial.println("From: " + pickup);
    Serial.println("To: " + destination);
    
    // Auto-accept or wait for button press
    // acceptRide(requestId);
  }
}

void acceptRide(String requestId) {
  StaticJsonDocument<200> doc;
  doc["type"] = "rider:accept";
  doc["riderId"] = "RIDER-001";
  doc["requestId"] = requestId;
  
  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void rejectRide(String requestId) {
  StaticJsonDocument<200> doc;
  doc["type"] = "rider:reject";
  doc["riderId"] = "RIDER-001";
  doc["requestId"] = requestId;
  
  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}
```

---

## Message Protocol

### 1. Device Identification (First message)
```json
{
  "type": "identify",
  "deviceId": "RIDER-001",
  "deviceType": "ESP32-Rider"
}
```

**Response:**
```json
{
  "type": "identified",
  "deviceId": "RIDER-001",
  "timestamp": "2025-11-16T10:30:00.000Z"
}
```

### 2. Rider Heartbeat (Location update)
```json
{
  "type": "rider:heartbeat",
  "riderId": "RIDER-001",
  "latitude": 22.4625,
  "longitude": 91.9692
}
```

**Response:**
```json
{
  "type": "heartbeat_ack",
  "riderId": "RIDER-001",
  "status": "received"
}
```

### 3. Receive Ride Offer
```json
{
  "type": "ride:offer",
  "requestId": "REQ-1234567890",
  "pickup": "Source Booth 01",
  "destination": "Destination 01",
  "distance": 500,
  "timestamp": "2025-11-16T10:30:00.000Z"
}
```

### 4. Accept Ride
```json
{
  "type": "rider:accept",
  "riderId": "RIDER-001",
  "requestId": "REQ-1234567890"
}
```

### 5. Reject Ride
```json
{
  "type": "rider:reject",
  "riderId": "RIDER-001",
  "requestId": "REQ-1234567890"
}
```

### 6. Booth Request (For booth IoT devices)
```json
{
  "type": "booth:request",
  "boothId": "SOURCE-BOOTH-01",
  "destinationId": "DEST-01"
}
```

---

## Testing with Python

```python
import asyncio
import websockets
import json

async def test_connection():
    uri = "ws://localhost:8080"
    
    async with websockets.connect(uri) as websocket:
        # Identify device
        await websocket.send(json.dumps({
            "type": "identify",
            "deviceId": "TEST-DEVICE-001",
            "deviceType": "Python-Test"
        }))
        
        # Wait for response
        response = await websocket.recv()
        print(f"Received: {response}")
        
        # Send heartbeat
        await websocket.send(json.dumps({
            "type": "rider:heartbeat",
            "riderId": "RIDER-001",
            "latitude": 22.4625,
            "longitude": 91.9692
        }))
        
        # Keep listening
        while True:
            message = await websocket.recv()
            print(f"Received: {message}")

asyncio.run(test_connection())
```

---

## Environment Variables

Add to `.env`:
```env
WS_PORT=8080
```

---

## Benefits

✅ **Native WebSocket Support** - ESP32, Arduino can connect directly  
✅ **Socket.IO Preserved** - Web dashboard continues to work  
✅ **Bi-directional Bridge** - Messages flow both ways  
✅ **Automatic Reconnection** - IoT devices can reconnect seamlessly  
✅ **JSON Protocol** - Simple, standard communication  

---

## Production Deployment

When deploying to Render/Heroku:

1. Update `.env`:
```env
BACKEND_URL=https://your-app.onrender.com
WS_PORT=8080
```

2. Connect from ESP32:
```cpp
const char* ws_host = "your-app.onrender.com";
const uint16_t ws_port = 8080;
```

3. Ensure your hosting provider allows WebSocket connections on port 8080.
