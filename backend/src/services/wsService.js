/**
 * COASTGUARD - WebSocket Service
 * Broadcasts real-time sensor/event updates to all connected clients.
 * Architecture: same interface can be driven by real MQTT in production.
 */

const WebSocket = require('ws');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  attach(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[WS] Client connected. Total: ${this.clients.size}`);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected. Total: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.error('[WS] Error:', err.message);
        this.clients.delete(ws);
      });

      // Send initial connection acknowledgment
      ws.send(JSON.stringify({ type: 'connected', message: 'COASTGUARD WebSocket Active', timestamp: new Date().toISOString() }));
    });
  }

  broadcast(type, data) {
    const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(payload); } catch (e) { /* ignore send errors */ }
      }
    });
  }

  broadcastSensorUpdate(state) {
    this.broadcast('sensor_update', {
      nodes: Object.values(state.nodes).map(n => ({
        id: n.id, name: n.name, status: n.status,
        sensors: n.sensors, lastHeartbeat: n.lastHeartbeat
      }))
    });
  }

  broadcastHotspotUpdate(hotspots) {
    this.broadcast('hotspot_update', { hotspots: Object.values(hotspots) });
  }

  broadcastEvent(event) {
    this.broadcast('event_log', { event });
  }

  broadcastKPIs(kpis) {
    this.broadcast('kpi_update', { kpis });
  }

  broadcastAlert(alert) {
    this.broadcast('alert_created', { alert });
  }
}

module.exports = new WebSocketService();
