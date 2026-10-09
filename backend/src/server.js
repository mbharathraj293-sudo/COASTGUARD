/**
 * COASTGUARD - Express Server
 * Main entry point for the backend
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

const SensorSimulator = require('./services/sensorSimulator');
const wsService = require('./services/wsService');
const { router: apiRouter, injectDeps } = require('./routes/api');

const app = express();
const server = http.createServer(app);

// ─── MIDDLEWARE ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// ─── WEBSOCKET ──────────────────────────────────────────────────────────────────
wsService.attach(server);

// ─── SENSOR SIMULATOR ──────────────────────────────────────────────────────────
const simulator = new SensorSimulator();

// Wire simulator updates → WebSocket broadcasts
let lastEventCount = 0;
simulator.onUpdate((state) => {
  wsService.broadcastSensorUpdate(state);
  wsService.broadcastHotspotUpdate(state.hotspots);
  wsService.broadcastKPIs(state.kpis);

  // Broadcast new events
  if (state.eventLog.length > lastEventCount) {
    const newEvents = state.eventLog.slice(0, state.eventLog.length - lastEventCount);
    newEvents.forEach(evt => wsService.broadcastEvent(evt));
    lastEventCount = state.eventLog.length;
  }
  if (state.eventLog.length < lastEventCount) {
    lastEventCount = state.eventLog.length;
  }
});

// ─── INJECT DEPENDENCIES ───────────────────────────────────────────────────────
injectDeps(simulator, wsService);

// ─── API ROUTES ─────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── SPA FALLBACK ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ─── START SERVER ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🌊 COASTGUARD Backend Active`);
  console.log(`   Server: http://localhost:${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api`);
  console.log(`   Mode:   ${process.env.NODE_ENV || 'development'}`);
  console.log(`   ⚠  All sensor data is SIMULATED for demonstration.\n`);
});

module.exports = { app, server };
