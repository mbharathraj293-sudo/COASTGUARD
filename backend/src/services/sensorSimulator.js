/**
 * COASTGUARD - Sensor Simulation Engine
 * 
 * Simulates IoT sensor data with realistic environmental correlations.
 * Architecture is modular - real MQTT/ESP32-S3 data can replace this layer.
 * 
 * Environmental correlation model:
 * rainfall ↑ → flow ↑ → waterLevel ↑ → plasticBurden ↑ → priority ↑
 */

const { FIELD_NODES, NODE_BASE_PARAMS, HOTSPOT_BASE } = require('../models/demoData');

class SensorSimulator {
  constructor() {
    this.nodes = {};
    this.hotspots = {};
    this.mode = 'normal'; // normal | monsoon | plastic_surge | node_failure | recovery
    this.modeIntensity = 0; // 0-1 ramp for smooth transitions
    this.eventLog = [];
    this.recurrenceTracker = {}; // tracks detection counts per node per 24h
    
    this._initNodes();
    this._initHotspots();
    
    // Start the simulation tick
    this._tick();
  }

  _initNodes() {
    FIELD_NODES.forEach(node => {
      const base = NODE_BASE_PARAMS[node.id];
      this.nodes[node.id] = {
        ...node,
        status: 'online',
        lastHeartbeat: new Date().toISOString(),
        sensors: { ...base },
        history: [] // rolling 60-point history
      };
      this.recurrenceTracker[node.id] = { count: 0, lastReset: Date.now() };
    });
  }

  _initHotspots() {
    FIELD_NODES.forEach((node, idx) => {
      const base = HOTSPOT_BASE[node.id];
      const score = this._calcPriority(base);
      this.hotspots[node.id] = {
        nodeId: node.id,
        name: node.name,
        lat: node.lat,
        lng: node.lng,
        location: node.location,
        zone: node.zone,
        severity: base.severity,
        persistence: base.persistence,
        exposure: base.exposure,
        feasibility: base.feasibility,
        priorityScore: score,
        status: this._priorityToStatus(score),
        recommendation: this._priorityToRecommendation(score),
        recurrenceCount: Math.floor(Math.random() * 5) + 3,
        evidenceCount: Math.floor(Math.random() * 8) + 6,
        firstDetected: new Date(Date.now() - 86400000 * (15 + idx * 4)).toISOString(),
        lastDetected: new Date().toISOString(),
        trend: score >= 70 ? 'INCREASING' : score >= 40 ? 'STABLE' : 'DECREASING',
        environmentalCorrelation: score >= 70 ? '+0.89' : '+0.74',
        confidence: Math.round(88 + Math.random() * 8),
        lastUpdated: new Date().toISOString()
      };
    });
  }

  _calcPriority({ severity, persistence, exposure, feasibility }) {
    // PRIORITY = severity × persistence × exposure × feasibility (normalized to 0-100)
    // Max theoretical = 1×1×1×1 = 1 → 100
    const raw = severity * persistence * exposure * feasibility;
    return Math.round(raw * 100);
  }

  _priorityToStatus(score) {
    if (score >= 70) return 'critical';
    if (score >= 45) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  _priorityToRecommendation(score) {
    if (score >= 70) return 'ACT NOW';
    if (score >= 40) return 'VERIFY / SCHEDULE';
    return 'MONITOR';
  }

  // Smooth noise function for realistic sensor variation
  _noise(base, range, t) {
    return base + Math.sin(t * 0.37 + base) * range * 0.4
                + Math.cos(t * 0.19 + base * 2) * range * 0.3
                + (Math.random() - 0.5) * range * 0.3;
  }

  _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  _tick() {
    const interval = setInterval(() => {
      this._updateAll();
    }, 2500);
    // Keep reference for cleanup
    this._interval = interval;
  }

  setMode(mode) {
    const validModes = ['normal', 'monsoon', 'plastic_surge', 'node_failure', 'recovery'];
    if (!validModes.includes(mode)) return;
    this.mode = mode;
    this.modeIntensity = 0;
    this._logEvent('SYSTEM', `Simulation mode changed to: ${mode.toUpperCase()}`, 'info');
  }

  _getModeMultipliers(nodeId) {
    const i = Math.min(1, this.modeIntensity + 0.05); // ramp up
    this.modeIntensity = i;

    switch (this.mode) {
      case 'monsoon':
        return {
          rainfall: 1 + i * 8,     // up to 9x
          flow: 1 + i * 3,          // up to 4x
          waterLevel: 1 + i * 1.2,  // up to 2.2x
          plasticBurden: 1 + i * 0.6, // up to 1.6x
          severity: 1 + i * 0.5,
          persistence: 1 + i * 0.4,
          exposure: 1 + i * 0.15,
          feasibility: 1 + i * 0.28
        };
      case 'plastic_surge':
        return {
          rainfall: 1 + i * 0.5,
          flow: 1 + i * 0.8,
          waterLevel: 1 + i * 0.3,
          plasticBurden: 1 + i * 1.2,  // main surge
          severity: 1 + i * 0.8,
          persistence: 1 + i * 0.6
        };
      case 'node_failure':
        return { rainfall: 1, flow: 1, waterLevel: 1, plasticBurden: 1, severity: 1, persistence: 1, _failNode: 'OUT-03' };
      case 'recovery':
        return {
          rainfall: 0.7,
          flow: 0.8,
          waterLevel: 0.85,
          plasticBurden: 1 - i * 0.5,  // decreasing
          severity: 1 - i * 0.4,
          persistence: 1 - i * 0.35
        };
      default: // normal
        return { rainfall: 1, flow: 1, waterLevel: 1, plasticBurden: 1, severity: 1, persistence: 1 };
    }
  }

  _updateAll() {
    const t = Date.now() / 1000;
    const mult = this._getModeMultipliers();

    Object.keys(this.nodes).forEach(nodeId => {
      const node = this.nodes[nodeId];
      const base = NODE_BASE_PARAMS[nodeId];
      const hotspotBase = HOTSPOT_BASE[nodeId];

      // Handle node failure mode
      if (mult._failNode === nodeId) {
        node.status = 'offline';
        node.sensors.signal = 0;
        node.sensors.battery = Math.max(0, node.sensors.battery - 1);
        node.sensors.telemetryConfidence = 0;
        node.dataQualityWarning = 'COMMUNICATION TIMEOUT — Telemetry confidence degraded';
        node.lastHeartbeat = new Date(Date.now() - 120000).toISOString();
        return;
      } else if (node.status === 'offline' && this.mode !== 'node_failure') {
        node.status = 'online';
        delete node.dataQualityWarning;
      }

      // Update sensor readings with realistic correlations
      const rain = this._clamp(this._noise(base.rainfall * mult.rainfall, 2, t + parseInt(nodeId.slice(-2))), 0, 120);
      const flow = this._clamp(
        this._noise(base.flow * mult.flow, 5, t + 1) + rain * 0.8,
        0, 200
      );
      const waterLevel = this._clamp(
        this._noise(base.waterLevel * mult.waterLevel, 4, t + 2) + rain * 0.3,
        0, 100
      );
      const temp = this._clamp(this._noise(base.temp, 0.5, t + 3), 20, 40);
      
      // Plastic burden correlates with flow + rainfall
      const plasticBurden = this._clamp(
        base.plasticBurden * mult.plasticBurden + (rain / 100) * 0.3 + (flow / 200) * 0.2
        + this._noise(0, 0.05, t + 4),
        0, 1
      );

      // Transport risk: relationship-driven metric from flow and rainfall velocity
      const transportRisk = this._clamp((flow / 180) * 0.55 + (rain / 100) * 0.45, 0, 1);

      const battery = this._clamp(base.battery - (Date.now() / 1e9) % 2, 0, 100);
      const signal = this._clamp(this._noise(base.signal, 5, t + 5), 0, 100);

      node.sensors = {
        waterLevel: Math.round(waterLevel * 10) / 10,
        flow: Math.round(flow * 10) / 10,
        rainfall: Math.round(rain * 10) / 10,
        temp: Math.round(temp * 10) / 10,
        plasticBurden: Math.round(plasticBurden * 100) / 100,
        transportRisk: Math.round(transportRisk * 100) / 100,
        battery: Math.round(battery),
        signal: Math.round(signal),
        telemetryConfidence: signal >= 50 ? 98 : signal >= 20 ? 82 : 45
      };

      node.status = signal < 20 ? 'warning' : 'online';
      node.lastHeartbeat = new Date().toISOString();

      // Keep 60-point rolling history
      node.history.push({ t: Date.now(), ...node.sensors });
      if (node.history.length > 60) node.history.shift();

      // Update hotspot
      const hs = this.hotspots[nodeId];
      const severity = this._clamp(hotspotBase.severity * mult.severity + (plasticBurden - base.plasticBurden) * 0.3, 0, 1);
      const persistence = this._clamp(hotspotBase.persistence * mult.persistence, 0, 1);
      const exposure = hotspotBase.exposure; // relatively stable
      const feasibility = hotspotBase.feasibility;

      const newScore = this._calcPriority({ severity, persistence, exposure, feasibility });

      // Check if hotspot status changed
      const oldStatus = hs.status;
      hs.severity = Math.round(severity * 100) / 100;
      hs.persistence = Math.round(persistence * 100) / 100;
      hs.exposure = Math.round(exposure * 100) / 100;
      hs.feasibility = Math.round(feasibility * 100) / 100;
      hs.priorityScore = newScore;
      hs.status = this._priorityToStatus(newScore);
      hs.recommendation = this._priorityToRecommendation(newScore);
      hs.lastUpdated = new Date().toISOString();

      // Track detections for recurrence
      if (plasticBurden > 0.7) {
        this.recurrenceTracker[nodeId].count++;
        // Reset counter every 24h
        if (Date.now() - this.recurrenceTracker[nodeId].lastReset > 86400000) {
          this.recurrenceTracker[nodeId] = { count: 1, lastReset: Date.now() };
        }
        hs.recurrenceCount = this.recurrenceTracker[nodeId].count;
      }

      // Generate events for significant changes
      if (oldStatus !== hs.status) {
        const severity_label = hs.status === 'critical' ? 'CRITICAL' : hs.status === 'high' ? 'WARNING' : 'INFO';
        this._logEvent(nodeId, `Hotspot status changed to ${hs.status.toUpperCase()} (Score: ${newScore})`, severity_label.toLowerCase());
      }

      // Detect plastic events
      if (plasticBurden > 0.75 && Math.random() < 0.1) {
        this._logEvent(nodeId, `Plastic cluster detected — burden index ${Math.round(plasticBurden * 100)}%`, 'warning');
      }
    });

    this._updateCallback && this._updateCallback(this.getState());
  }

  _logEvent(nodeId, message, type = 'info') {
    const event = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
      nodeId,
      message,
      type,
      timestamp: new Date().toISOString()
    };
    this.eventLog.unshift(event);
    if (this.eventLog.length > 200) this.eventLog.pop();
    return event;
  }

  onUpdate(callback) {
    this._updateCallback = callback;
  }

  getState() {
    return {
      nodes: this.nodes,
      hotspots: this.hotspots,
      mode: this.mode,
      eventLog: this.eventLog.slice(0, 50),
      timestamp: new Date().toISOString(),
      kpis: this._calcKPIs()
    };
  }

  setRecordsProvider(provider) {
    this._recordsProvider = provider;
  }

  _calcKPIs() {
    const nodes = Object.values(this.nodes);
    const hotspots = Object.values(this.hotspots);
    
    const activeHotspots = hotspots.filter(h => h.status === 'critical' || h.status === 'high').length;
    const plasticDetected = nodes.reduce((sum, n) => sum + (n.sensors.plasticBurden || 0), 0);
    const highPriority = hotspots.filter(h => h.priorityScore >= 70).length;
    const nodesOnline = nodes.filter(n => n.status === 'online').length;

    let activeInterventionsCount = 2;
    let recoveryTotalKg = this.totalRecoveryKg || 211;

    if (this._recordsProvider) {
      const records = this._recordsProvider();
      if (records && records.interventions) {
        activeInterventionsCount = records.interventions.filter(i => i.status !== 'completed').length;
      }
      if (records && records.recoveryRecords) {
        recoveryTotalKg = records.recoveryRecords.reduce((sum, r) => sum + (Number(r.collectedKg) || 0), 0);
      }
    }

    return {
      activeHotspots,
      plasticDetected: Math.round(plasticDetected * 100) / 100,
      highPrioritySites: highPriority,
      activeInterventions: activeInterventionsCount,
      recoveryQuantity: recoveryTotalKg,
      nodesOnline,
      totalNodes: nodes.length
    };
  }

  triggerDemoStep(step) {
    const steps = {
      1: () => {
        this.setMode('normal');
        this._logEvent('SYSTEM', 'Step 1: Baseline system monitoring active — normal rainfall & flow', 'info');
      },
      2: () => {
        this.mode = 'monsoon';
        this.modeIntensity = 0.35;
        if (this.nodes['OUT-07']?.sensors) {
          this.nodes['OUT-07'].sensors.rainfall = 18.4;
        }
        this._logEvent('OUT-07', 'Step 2: Monsoon surge detected — rainfall reaching 18.4 mm/h', 'warning');
      },
      3: () => {
        this.modeIntensity = 0.65;
        if (this.nodes['OUT-07']?.sensors) {
          this.nodes['OUT-07'].sensors.rainfall = 34.2;
          this.nodes['OUT-07'].sensors.flow = 86.5;
          this.nodes['OUT-07'].sensors.waterLevel = 82.1;
        }
        this._logEvent('OUT-07', 'Step 3: Hydrodynamic response — outfall flow surged to 86.5 L/s', 'warning');
      },
      4: () => {
        if (this.nodes['OUT-07']?.sensors) {
          this.nodes['OUT-07'].sensors.plasticBurden = 0.94;
          this.nodes['OUT-07'].sensors.transportRisk = 0.96;
        }
        this._logEvent('OUT-07', 'Step 4: Plastic transport risk escalated — hydrodynamic flush index 96%', 'critical');
      },
      5: () => {
        this._logEvent('OUT-07', 'Step 5: Optical AI Inference: High-density PET plastic debris identified (94% conf)', 'critical');
      },
      6: () => {
        this.modeIntensity = 0.85;
        if (this.hotspots['OUT-07']) {
          this.hotspots['OUT-07'].recurrenceCount = 12;
          this.hotspots['OUT-07'].trend = 'INCREASING';
          this.hotspots['OUT-07'].persistence = 0.95;
        }
        this._logEvent('OUT-07', 'Step 6: Temporal intelligence confirms 12 recurring events in 24h (Persistence HIGH)', 'critical');
      },
      7: () => {
        this.modeIntensity = 1.0;
        if (this.hotspots['OUT-07']) {
          this.hotspots['OUT-07'].severity = 0.98;
          this.hotspots['OUT-07'].persistence = 0.95;
          this.hotspots['OUT-07'].exposure = 0.96;
          this.hotspots['OUT-07'].feasibility = 0.94;
          this.hotspots['OUT-07'].priorityScore = 87;
          this.hotspots['OUT-07'].status = 'critical';
          this.hotspots['OUT-07'].recommendation = 'ACT NOW';
          this.hotspots['OUT-07'].lastUpdated = new Date().toISOString();
        }
        this._logEvent('OUT-07', 'Step 7: Decision Engine recomputed priority formula — score elevated to 87/100', 'critical');
      },
      8: () => {
        if (this.hotspots['OUT-07']) {
          this.hotspots['OUT-07'].priorityScore = 87;
          this.hotspots['OUT-07'].status = 'critical';
          this.hotspots['OUT-07'].recommendation = 'ACT NOW';
        }
        this._logEvent('OUT-07', 'Step 8: Threshold breach — Site escalated to ACT NOW (Immediate containment)', 'critical');
      },
      9: () => {
        this._logEvent('ALERT', 'Step 9: Priority Alert dispatched to municipal coastal response grid', 'critical');
      },
      10: () => {
        this._logEvent('OUT-07', 'Step 10: Intervention ticket generated — INT-MITHI-2024-07', 'info');
      },
      11: () => {
        this._logEvent('OUT-07', 'Step 11: Field Team Alpha dispatched with containment boom gear', 'info');
      },
      12: () => {
        this.setMode('recovery');
        if (this.nodes['OUT-07']?.sensors) {
          this.nodes['OUT-07'].sensors.plasticBurden = 0.32;
          this.nodes['OUT-07'].sensors.transportRisk = 0.40;
        }
        if (this.hotspots['OUT-07']) {
          this.hotspots['OUT-07'].severity = 0.45;
          this.hotspots['OUT-07'].priorityScore = 42;
          this.hotspots['OUT-07'].status = 'high';
          this.hotspots['OUT-07'].recommendation = 'VERIFY / SCHEDULE';
        }
        this._logEvent('OUT-07', 'Step 12: Interception confirmed — 127 kg plastic collected at creek mouth', 'info');
      },
      13: () => {
        this.totalRecoveryKg = (this.totalRecoveryKg || 211) + 127;
        this._logEvent('OUT-07', 'Step 13: Recovery ledger updated — total recovered: 338 kg', 'info');
      },
      14: () => {
        this._logEvent('OUT-07', 'Step 14: Material classified: PET 42kg (33%) / HDPE 31kg (24%) / Flex 28kg (22%) / Mixed 26kg (21%)', 'info');
      },
      15: () => {
        this._logEvent('OUT-07', 'Step 15: Circular pathway routed: 60% Mechanical Recycling / 25% Material Recovery / 15% Disposal', 'info');
      },
      16: () => {
        this._logEvent('OUT-07', 'Step 16: End-to-end verification complete: Leakage Intercepted → Value Recovered', 'info');
      }
    };
    if (steps[step]) {
      steps[step]();
      return true;
    }
    return false;
  }
}

module.exports = SensorSimulator;
