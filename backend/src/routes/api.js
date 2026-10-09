/**
 * COASTGUARD - API Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { DEMO_INTERVENTIONS, DEMO_RECOVERY } = require('../models/demoData');

let simulator; // injected
let wsService; // injected
let interventions = [...DEMO_INTERVENTIONS];
let recoveryRecords = [...DEMO_RECOVERY];

function injectDeps(sim, ws) {
  simulator = sim;
  wsService = ws;
  if (simulator && simulator.setRecordsProvider) {
    simulator.setRecordsProvider(() => ({ interventions, recoveryRecords }));
  }
}

// ─── HEALTH ────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ success: true, status: 'healthy', simulated: true, timestamp: new Date().toISOString() });
});

// ─── NODES ─────────────────────────────────────────────────────────────────────

router.get('/nodes', (req, res) => {
  const state = simulator.getState();
  res.json({ success: true, data: Object.values(state.nodes), simulated: true });
});

router.get('/nodes/:id', (req, res) => {
  const state = simulator.getState();
  const node = state.nodes[req.params.id];
  if (!node) return res.status(404).json({ success: false, error: 'Node not found' });
  const hotspot = state.hotspots[req.params.id];
  res.json({ success: true, data: { ...node, hotspot }, simulated: true });
});

// ─── HOTSPOTS ──────────────────────────────────────────────────────────────────

router.get('/hotspots', (req, res) => {
  const state = simulator.getState();
  const { filter } = req.query;
  let hotspots = Object.values(state.hotspots);
  if (filter && filter !== 'all') {
    hotspots = hotspots.filter(h => h.status === filter || h.recommendation?.toLowerCase().replace(/[^a-z]/g, '_').includes(filter));
  }
  res.json({ success: true, data: hotspots.sort((a, b) => b.priorityScore - a.priorityScore), simulated: true });
});

router.get('/hotspots/:id', (req, res) => {
  const state = simulator.getState();
  const hotspot = state.hotspots[req.params.id];
  if (!hotspot) return res.status(404).json({ success: false, error: 'Hotspot not found' });
  const node = state.nodes[req.params.id];
  res.json({ success: true, data: { ...hotspot, node }, simulated: true });
});

// ─── INTERVENTIONS ─────────────────────────────────────────────────────────────

router.get('/interventions', (req, res) => {
  res.json({ success: true, data: interventions, simulated: true });
});

router.post('/interventions', (req, res) => {
  const { nodeId, reason, recommendedAction, assignedTeam } = req.body;
  if (!nodeId) return res.status(400).json({ success: false, error: 'nodeId required' });

  const state = simulator.getState();
  const hotspot = state.hotspots[nodeId];
  const node = state.nodes[nodeId];

  const intervention = {
    id: uuidv4(),
    nodeId,
    siteName: node?.name || nodeId,
    priority: hotspot?.priorityScore || 50,
    reason: reason || 'Manual dispatch',
    recommendedAction: recommendedAction || 'Field team inspection',
    assignedTeam: assignedTeam || 'Field Team Alpha',
    estimatedResponse: '45 min',
    status: 'dispatched',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  interventions.unshift(intervention);
  wsService.broadcast('intervention_update', { intervention, action: 'created' });
  if (simulator) wsService.broadcast('kpi_update', { kpis: simulator.getState().kpis });
  wsService.broadcastAlert({
    id: uuidv4(), type: 'info',
    title: 'Intervention Dispatched',
    message: `Team dispatched to ${intervention.siteName}`,
    nodeId, timestamp: new Date().toISOString()
  });

  res.status(201).json({ success: true, data: intervention });
});

router.patch('/interventions/:id', (req, res) => {
  const intervention = interventions.find(i => i.id === req.params.id);
  if (!intervention) return res.status(404).json({ success: false, error: 'Intervention not found' });

  const { status } = req.body;
  const validStatuses = ['alert', 'dispatched', 'in_progress', 'intercepted', 'collection', 'completed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });

  intervention.status = status;
  intervention.updatedAt = new Date().toISOString();

  wsService.broadcast('intervention_update', { intervention, action: 'updated' });
  if (simulator) wsService.broadcast('kpi_update', { kpis: simulator.getState().kpis });
  
  if (status === 'completed') {
    simulator.setMode('recovery');
    wsService.broadcastAlert({
      id: uuidv4(), type: 'info',
      title: 'Intervention Completed',
      message: `Intervention at ${intervention.siteName} completed`,
      nodeId: intervention.nodeId, timestamp: new Date().toISOString()
    });
  }

  res.json({ success: true, data: intervention });
});

// ─── RECOVERY ──────────────────────────────────────────────────────────────────

router.get('/recovery', (req, res) => {
  res.json({ success: true, data: recoveryRecords, simulated: true });
});

router.post('/recovery', (req, res) => {
  const { nodeId, collectedKg, materials, recoveryPathway } = req.body;
  if (!nodeId || !collectedKg) return res.status(400).json({ success: false, error: 'nodeId and collectedKg required' });

  const state = simulator.getState();
  const node = state.nodes[nodeId];

  const record = {
    id: uuidv4(),
    nodeId,
    siteName: node?.name || nodeId,
    collectedKg: Number(collectedKg),
    materials: materials || {},
    recoveryPathway: recoveryPathway || { Recycling: 60, 'Material Recovery': 25, 'Safe Disposal': 15 },
    collectedAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString()
  };

  recoveryRecords.unshift(record);
  if (simulator) {
    simulator.totalRecoveryKg = (simulator.totalRecoveryKg || 211) + Number(collectedKg);
  }
  wsService.broadcast('recovery_update', { record, action: 'created' });
  wsService.broadcast('kpi_update', { kpis: simulator.getState().kpis });

  res.status(201).json({ success: true, data: record });
});

// ─── ANALYTICS ─────────────────────────────────────────────────────────────────

router.get('/analytics', (req, res) => {
  const state = simulator.getState();
  const hotspots = Object.values(state.hotspots);

  // Generate 7-day trend data (simulated)
  const trend7Day = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86400000);
    return {
      date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      plastic: Math.round(30 + Math.random() * 80 + (state.mode === 'monsoon' ? 40 : 0)),
      interventions: Math.floor(Math.random() * 5) + 1,
      recovery: Math.round(50 + Math.random() * 100)
    };
  });

  // 24-hour leakage trend
  const trend24h = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    burden: Math.round(20 + Math.random() * 60 + (i >= 14 && i <= 20 ? 25 : 0))
  }));

  // Hotspot ranking
  const ranking = hotspots.map(h => ({
    id: h.nodeId, name: h.name,
    score: h.priorityScore, status: h.status
  })).sort((a, b) => b.score - a.score);

  // Recovery distribution
  const totalRecovery = recoveryRecords.reduce((sum, r) => sum + r.collectedKg, 0);
  const materialTotals = {};
  recoveryRecords.forEach(r => {
    Object.entries(r.materials || {}).forEach(([mat, kg]) => {
      materialTotals[mat] = (materialTotals[mat] || 0) + kg;
    });
  });

  // Intervention performance
  const avgResponseTime = 62; // minutes (simulated)
  const detectionAccuracy = 91; // % (simulated)
  const sensorUptime = Math.round(
    (Object.values(state.nodes).filter(n => n.status === 'online').length / Object.values(state.nodes).length) * 100
  );

  res.json({
    success: true,
    simulated: true,
    data: {
      trend7Day, trend24h, ranking,
      totalRecoveryKg: totalRecovery,
      materialDistribution: materialTotals,
      avgResponseTime,
      detectionAccuracy,
      sensorUptime,
      kpis: state.kpis
    }
  });
});

// ─── DETECTIONS ────────────────────────────────────────────────────────────────

router.get('/detections', (req, res) => {
  // Simulated detection events from recent history
  const detections = [
    { id: uuidv4(), nodeId: 'OUT-07', objects: [
      { class: 'Plastic Bottle', confidence: 0.94, count: 7 },
      { class: 'Plastic Bag', confidence: 0.89, count: 4 },
      { class: 'Mixed Debris', confidence: 0.82, count: 3 }
    ], burden: 'HIGH', timestamp: new Date(Date.now() - 300000).toISOString() },
    { id: uuidv4(), nodeId: 'OUT-06', objects: [
      { class: 'Food Packaging', confidence: 0.87, count: 5 },
      { class: 'Plastic Bag', confidence: 0.91, count: 6 }
    ], burden: 'HIGH', timestamp: new Date(Date.now() - 900000).toISOString() }
  ];
  res.json({ success: true, data: detections, simulated: true });
});

// ─── SIMULATION CONTROL ────────────────────────────────────────────────────────

router.post('/simulation/event', (req, res) => {
  const { mode } = req.body;
  if (!mode) return res.status(400).json({ success: false, error: 'mode required' });
  simulator.setMode(mode);
  wsService.broadcast('simulation_mode', { mode });
  res.json({ success: true, data: { mode, message: `Simulation mode set to ${mode}` } });
});

router.post('/simulation/demo-step', (req, res) => {
  const { step } = req.body;
  const numStep = Number(step);
  const ok = simulator.triggerDemoStep(numStep);
  if (!ok) return res.status(400).json({ success: false, error: 'Invalid step' });

  // Dynamically update intervention and recovery records on relevant demo steps
  if (numStep === 10) {
    const intIndex = interventions.findIndex(i => i.id === 'demo-int-mithi-07');
    const newInt = {
      id: 'demo-int-mithi-07',
      nodeId: 'OUT-07',
      siteName: 'Mithi Creek Outfall',
      priority: 87,
      reason: 'Monsoon surge + plastic cluster detected (Burden 94%, Persistence HIGH)',
      recommendedAction: 'Deploy boom interceptor + manual collection team at creek mouth',
      assignedTeam: 'Field Team Alpha',
      estimatedResponse: '30 min',
      status: 'alert',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (intIndex >= 0) interventions[intIndex] = newInt;
    else interventions.unshift(newInt);
    wsService.broadcast('intervention_update', { intervention: newInt, action: 'created' });
  } else if (numStep === 11) {
    const demoInt = interventions.find(i => i.id === 'demo-int-mithi-07');
    if (demoInt) {
      demoInt.status = 'dispatched';
      demoInt.updatedAt = new Date().toISOString();
      wsService.broadcast('intervention_update', { intervention: demoInt, action: 'updated' });
    }
  } else if (numStep === 12) {
    const demoInt = interventions.find(i => i.id === 'demo-int-mithi-07');
    if (demoInt) {
      demoInt.status = 'completed';
      demoInt.updatedAt = new Date().toISOString();
      wsService.broadcast('intervention_update', { intervention: demoInt, action: 'updated' });
    }
  } else if (numStep === 13) {
    const recIndex = recoveryRecords.findIndex(r => r.id === 'demo-rec-mithi-07');
    const newRec = {
      id: 'demo-rec-mithi-07',
      interventionId: 'demo-int-mithi-07',
      nodeId: 'OUT-07',
      siteName: 'Mithi Creek Outfall',
      collectedKg: 127,
      materials: {
        PET: 42,
        HDPE: 31,
        'Flexible Plastic': 28,
        'Mixed Plastic': 26
      },
      recoveryPathway: { Recycling: 60, 'Material Recovery': 25, 'Safe Disposal': 15 },
      collectedAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString()
    };
    if (recIndex >= 0) recoveryRecords[recIndex] = newRec;
    else recoveryRecords.unshift(newRec);
    wsService.broadcast('recovery_update', { record: newRec, action: 'created' });
  }
  
  const state = simulator.getState();
  wsService.broadcast('sensor_update', { nodes: Object.values(state.nodes).map(n => ({ id: n.id, status: n.status, sensors: n.sensors })) });
  wsService.broadcast('hotspot_update', { hotspots: Object.values(state.hotspots) });
  wsService.broadcast('kpi_update', { kpis: state.kpis });
  
  if (state.eventLog[0]) {
    wsService.broadcastEvent(state.eventLog[0]);
    if (state.eventLog[0].type === 'critical') {
      wsService.broadcastAlert({
        id: uuidv4(),
        type: 'critical',
        title: 'PRIORITY ALERT: ' + state.eventLog[0].nodeId,
        message: state.eventLog[0].message,
        nodeId: state.eventLog[0].nodeId,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  res.json({ success: true, data: { step: numStep, event: state.eventLog[0] } });
});

// ─── STATE ─────────────────────────────────────────────────────────────────────

router.get('/state', (req, res) => {
  res.json({ success: true, data: simulator.getState(), simulated: true });
});

router.get('/events', (req, res) => {
  const state = simulator.getState();
  res.json({ success: true, data: state.eventLog });
});

module.exports = { router, injectDeps };
