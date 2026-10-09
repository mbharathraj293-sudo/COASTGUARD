/**
 * COASTGUARD - API Client
 * Centralized HTTP API calls to the backend.
 */

const API_BASE = '/api';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  
  try {
    const res = await fetch(API_BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
  } catch (err) {
    console.error(`[API] ${method} ${path}:`, err.message);
    throw err;
  }
}

const API = {
  getNodes: () => request('GET', '/nodes'),
  getNode: (id) => request('GET', `/nodes/${id}`),
  getHotspots: (filter = 'all') => request('GET', `/hotspots?filter=${filter}`),
  getHotspot: (id) => request('GET', `/hotspots/${id}`),
  getDetections: () => request('GET', '/detections'),
  getInterventions: () => request('GET', '/interventions'),
  createIntervention: (data) => request('POST', '/interventions', data),
  updateIntervention: (id, data) => request('PATCH', `/interventions/${id}`, data),
  getRecovery: () => request('GET', '/recovery'),
  createRecovery: (data) => request('POST', '/recovery', data),
  getAnalytics: () => request('GET', '/analytics'),
  getState: () => request('GET', '/state'),
  getEvents: () => request('GET', '/events'),
  setSimMode: (mode) => request('POST', '/simulation/event', { mode }),
  triggerDemoStep: (step) => request('POST', '/simulation/demo-step', { step })
};

window.API = API;
