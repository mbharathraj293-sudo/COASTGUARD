/**
 * COASTGUARD - App State
 * Central reactive state store for the frontend.
 */

const AppState = {
  // Data stores
  nodes: {},
  hotspots: {},
  interventions: [],
  recovery: [],
  alerts: [],
  eventLog: [],
  kpis: {
    activeHotspots: 0,
    plasticDetected: 0,
    highPrioritySites: 0,
    activeInterventions: 0,
    recoveryQuantity: 0,
    nodesOnline: 0,
    totalNodes: 8
  },

  // UI state
  currentPage: 'command-center',
  simMode: 'normal',
  simActive: false,
  selectedNodeId: 'OUT-07',
  notifCount: 0,
  lastUpdateTime: null,

  // Subscribers
  _subs: {},

  subscribe(key, handler) {
    if (!this._subs[key]) this._subs[key] = [];
    this._subs[key].push(handler);
    return () => {
      this._subs[key] = this._subs[key].filter(h => h !== handler);
    };
  },

  update(key, value) {
    this[key] = value;
    this.lastUpdateTime = new Date();
    (this._subs[key] || []).forEach(h => {
      try { h(value); } catch (e) { console.error('[State] Handler error:', e); }
    });
    (this._subs['*'] || []).forEach(h => {
      try { h({ key, value }); } catch (e) { /* ignore */ }
    });
  },

  addAlert(alert) {
    this.alerts.unshift(alert);
    if (this.alerts.length > 50) this.alerts.pop();
    this.notifCount++;
    this.update('alerts', this.alerts);
    this.update('notifCount', this.notifCount);
  },

  addEvent(event) {
    this.eventLog.unshift(event);
    if (this.eventLog.length > 100) this.eventLog.pop();
    this.update('eventLog', this.eventLog);
  }
};

window.AppState = AppState;
