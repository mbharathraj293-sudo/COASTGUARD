/**
 * COASTGUARD - Demo / Simulated Data
 * All data is SIMULATED for demonstration purposes.
 * Not real municipal measurements.
 */

const { v4: uuidv4 } = require('uuid');

// Simulated Mumbai-coastal drainage/outfall nodes
const FIELD_NODES = [
  {
    id: 'OUT-01', name: 'Versova Outfall North',
    lat: 19.1289, lng: 72.8109,
    location: 'Versova Creek, North', zone: 'Western Suburbs',
    type: 'coastal_outfall', installedAt: '2024-01-15'
  },
  {
    id: 'OUT-02', name: 'Versova Creek Mid',
    lat: 19.1215, lng: 72.8098,
    location: 'Versova Creek, Mid-Section', zone: 'Western Suburbs',
    type: 'creek_node', installedAt: '2024-01-15'
  },
  {
    id: 'OUT-03', name: 'Malad Creek Outfall',
    lat: 19.1765, lng: 72.8342,
    location: 'Malad Creek Outfall', zone: 'Western Suburbs',
    type: 'coastal_outfall', installedAt: '2024-02-01'
  },
  {
    id: 'OUT-04', name: 'Dahisar Creek Node',
    lat: 19.2187, lng: 72.8530,
    location: 'Dahisar Creek, Lower', zone: 'Northern Suburbs',
    type: 'creek_node', installedAt: '2024-02-10'
  },
  {
    id: 'OUT-05', name: 'Mithi Upstream Node',
    lat: 19.0760, lng: 72.8777,
    location: 'Mithi River, Kurla Section', zone: 'Central',
    type: 'river_node', installedAt: '2024-01-20'
  },
  {
    id: 'OUT-06', name: 'Mithi Mid-Junction',
    lat: 19.0556, lng: 72.8782,
    location: 'Mithi River, BKC Junction', zone: 'Central',
    type: 'river_node', installedAt: '2024-01-20'
  },
  {
    id: 'OUT-07', name: 'Mithi Creek Outfall',
    lat: 19.0385, lng: 72.8498,
    location: 'Mithi Creek → Mahim Bay Outfall', zone: 'South-Central',
    type: 'coastal_outfall', installedAt: '2024-01-10'
  },
  {
    id: 'OUT-08', name: 'Mahim Bay South Node',
    lat: 19.0296, lng: 72.8412,
    location: 'Mahim Bay Coastal Zone', zone: 'South-Central',
    type: 'coastal_outfall', installedAt: '2024-03-01'
  }
];

// Base environmental parameters per node
const NODE_BASE_PARAMS = {
  'OUT-01': { waterLevel: 35, flow: 18, rainfall: 1, temp: 28.4, plasticBurden: 0.45, battery: 87, signal: 92 },
  'OUT-02': { waterLevel: 40, flow: 22, rainfall: 1, temp: 28.2, plasticBurden: 0.52, battery: 94, signal: 88 },
  'OUT-03': { waterLevel: 28, flow: 15, rainfall: 0, temp: 28.7, plasticBurden: 0.38, battery: 71, signal: 79 },
  'OUT-04': { waterLevel: 22, flow: 12, rainfall: 0, temp: 29.1, plasticBurden: 0.25, battery: 99, signal: 95 },
  'OUT-05': { waterLevel: 55, flow: 38, rainfall: 3, temp: 27.9, plasticBurden: 0.68, battery: 83, signal: 86 },
  'OUT-06': { waterLevel: 62, flow: 45, rainfall: 4, temp: 27.6, plasticBurden: 0.74, battery: 76, signal: 82 },
  'OUT-07': { waterLevel: 71, flow: 58, rainfall: 8, temp: 27.2, plasticBurden: 0.88, battery: 91, signal: 90 },
  'OUT-08': { waterLevel: 48, flow: 32, rainfall: 2, temp: 27.8, plasticBurden: 0.61, battery: 65, signal: 74 }
};

// Priority formula base values
// NOTE: OUT-07 (Mithi Creek Outfall) is the primary demonstration hotspot.
// Base values calibrated so it scores ~72/100 in normal conditions → ACT NOW.
const HOTSPOT_BASE = {
  'OUT-01': { severity: 0.45, persistence: 0.40, exposure: 0.55, feasibility: 0.80 },
  'OUT-02': { severity: 0.52, persistence: 0.48, exposure: 0.60, feasibility: 0.78 },
  'OUT-03': { severity: 0.38, persistence: 0.35, exposure: 0.50, feasibility: 0.85 },
  'OUT-04': { severity: 0.25, persistence: 0.28, exposure: 0.40, feasibility: 0.90 },
  'OUT-05': { severity: 0.68, persistence: 0.65, exposure: 0.72, feasibility: 0.72 },
  'OUT-06': { severity: 0.74, persistence: 0.71, exposure: 0.78, feasibility: 0.70 },
  'OUT-07': { severity: 0.96, persistence: 0.92, exposure: 0.90, feasibility: 0.88 },  // primary demo hotspot → score ~70
  'OUT-08': { severity: 0.61, persistence: 0.58, exposure: 0.65, feasibility: 0.74 }
};

// Recovery material distribution
const MATERIAL_CATEGORIES = ['PET', 'HDPE', 'LDPE', 'Mixed Plastic', 'Other Debris'];

// Demo interventions — OUT-07 starts at 'alert' to show the full dispatch lifecycle
const DEMO_INTERVENTIONS = [
  {
    id: uuidv4(), nodeId: 'OUT-07', siteName: 'Mithi Creek Outfall',
    priority: 87, reason: 'Priority Score 87/100 — S:0.96 × P:0.92 × E:0.90 × F:0.88 — Monsoon surge + plastic cluster detected',
    recommendedAction: 'Deploy boom interceptor + manual collection team at creek mouth',
    assignedTeam: 'Field Team Alpha', estimatedResponse: '30 min',
    status: 'alert', createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: uuidv4(), nodeId: 'OUT-06', siteName: 'Mithi Mid-Junction',
    priority: 54, reason: 'Elevated flow + persistent plastic transport — Score 54/100',
    recommendedAction: 'Install temporary net barrier + schedule collection',
    assignedTeam: 'Field Team Beta', estimatedResponse: '90 min',
    status: 'in_progress', createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString()
  }
];

// Demo recovery records
const DEMO_RECOVERY = [
  {
    id: uuidv4(), interventionId: 'demo-1', nodeId: 'OUT-05',
    siteName: 'Mithi Upstream Node', collectedKg: 127,
    materials: { PET: 38, HDPE: 22, 'Flexible Plastic': 31, 'Mixed Plastic': 28, 'Other Debris': 8 },
    recoveryPathway: { Recycling: 60, 'Material Recovery': 25, 'Safe Disposal': 15 },
    collectedAt: new Date(Date.now() - 86400000).toISOString(),
    verifiedAt: new Date(Date.now() - 82800000).toISOString()
  },
  {
    id: uuidv4(), interventionId: 'demo-2', nodeId: 'OUT-03',
    siteName: 'Malad Creek Outfall', collectedKg: 84,
    materials: { PET: 24, HDPE: 16, 'Flexible Plastic': 20, 'Mixed Plastic': 18, 'Other Debris': 6 },
    recoveryPathway: { Recycling: 55, 'Material Recovery': 30, Upcycling: 5, 'Safe Disposal': 10 },
    collectedAt: new Date(Date.now() - 172800000).toISOString(),
    verifiedAt: new Date(Date.now() - 169200000).toISOString()
  }
];

module.exports = { FIELD_NODES, NODE_BASE_PARAMS, HOTSPOT_BASE, MATERIAL_CATEGORIES, DEMO_INTERVENTIONS, DEMO_RECOVERY };
