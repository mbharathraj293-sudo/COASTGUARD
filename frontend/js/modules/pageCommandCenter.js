/**
 * COASTGUARD - Command Center Page
 * Main hero dashboard with KPIs, map, alerts, and telemetry.
 */

const CommandCenter = {
  map: null,
  telemetryChart: null,
  hotspotsData: [],
  _chartData: { labels: [], waterLevel: [], flow: [], plasticBurden: [] },

  async init() {
    this._renderKPIs(AppState.kpis);
    this._renderAlerts([]);
    this._renderTelemetry(null);
    
    // Init map
    this.map = MapModule.initMap('cc-map', { zoom: 11 });
    MapModule.onMarkerClick((nodeId) => {
      this._showNodeDetail(nodeId);
    });

    // Init telemetry chart
    this._initTelemetryChart();

    // Load initial data
    try {
      const [stateRes, hotspotsRes] = await Promise.all([
        API.getState(),
        API.getHotspots()
      ]);

      if (stateRes.data) {
        this._processState(stateRes.data);
      }
      if (hotspotsRes.data) {
        this.hotspotsData = hotspotsRes.data;
        MapModule.renderHotspots('cc-map', this.hotspotsData);
        this._renderPriorityAlerts(this.hotspotsData);
      }
    } catch (e) {
      console.error('[CC] Init error:', e);
    }

    // Subscribe to real-time updates
    CGSocket.on('sensor_update', (data) => this._onSensorUpdate(data));
    CGSocket.on('hotspot_update', (data) => this._onHotspotUpdate(data));
    CGSocket.on('kpi_update', (data) => this._onKpiUpdate(data));
    CGSocket.on('event_log', (data) => this._onEventLog(data));
  },

  _processState(state) {
    if (state.kpis) this._renderKPIs(state.kpis);
    if (state.nodes) {
      const nodeArr = Object.values(state.nodes);
      if (nodeArr[0]) this._renderTelemetry(nodeArr[0].sensors);
    }
    if (state.eventLog) {
      this._renderEventLog(state.eventLog.slice(0, 8));
    }
  },

  _renderKPIs(kpis) {
    const el = id => document.getElementById(id);
    if (!el('kpi-active-hotspots')) return;

    const setVal = (id, val, flash) => {
      const e = el(id);
      if (!e) return;
      const old = e.textContent;
      e.textContent = val;
      if (String(old) !== String(val) && flash) {
        e.style.transition = 'none';
        e.style.color = '#00c896';
        setTimeout(() => { e.style.transition = 'color 0.5s'; e.style.color = ''; }, 50);
      }
    };

    setVal('kpi-active-hotspots', kpis.activeHotspots || 0, true);
    setVal('kpi-plastic-detected', kpis.plasticDetected?.toFixed(1) || '0.0', true);
    setVal('kpi-high-priority', kpis.highPrioritySites || 0, true);
    setVal('kpi-active-interventions', kpis.activeInterventions || 2, false);
    setVal('kpi-recovery', kpis.recoveryQuantity || 211, false);
    setVal('kpi-nodes-online', `${kpis.nodesOnline || 0}/${kpis.totalNodes || 8}`, true);
  },

  _renderTelemetry(sensors) {
    const s = sensors || { waterLevel: '--', flow: '--', rainfall: '--', plasticBurden: '--', temp: '--', battery: '--', signal: '--' };
    const setEl = (id, val, unit = '') => {
      const e = document.getElementById(id);
      if (e) e.textContent = val !== undefined ? `${val}${unit}` : '--';
    };
    setEl('telem-water', typeof s.waterLevel === 'number' ? s.waterLevel.toFixed(1) : s.waterLevel, '%');
    setEl('telem-flow', typeof s.flow === 'number' ? s.flow.toFixed(1) : s.flow, ' L/s');
    setEl('telem-rain', typeof s.rainfall === 'number' ? s.rainfall.toFixed(1) : s.rainfall, ' mm/h');
    setEl('telem-burden', typeof s.plasticBurden === 'number' ? (s.plasticBurden * 100).toFixed(0) : s.plasticBurden, '%');
    setEl('telem-risk', typeof s.transportRisk === 'number' ? (s.transportRisk * 100).toFixed(0) : (typeof s.plasticBurden === 'number' ? Math.round(s.plasticBurden * 90) : '--'), '%');
    setEl('telem-temp', typeof s.temp === 'number' ? s.temp.toFixed(1) : s.temp, '°C');
    setEl('telem-signal', typeof s.signal === 'number' ? s.signal : s.signal, '%');

    // Color coding
    const burdenEl = document.getElementById('telem-burden');
    if (burdenEl && typeof s.plasticBurden === 'number') {
      burdenEl.className = 'telem-value ' + (s.plasticBurden > 0.7 ? 'critical' : s.plasticBurden > 0.4 ? 'warning' : 'good');
    }
    const riskEl = document.getElementById('telem-risk');
    if (riskEl && (typeof s.transportRisk === 'number' || typeof s.plasticBurden === 'number')) {
      const rVal = s.transportRisk || s.plasticBurden || 0;
      riskEl.className = 'telem-value ' + (rVal > 0.7 ? 'critical' : rVal > 0.4 ? 'warning' : 'good');
    }
  },

  _initTelemetryChart() {
    const now = new Date();
    const labels = Array.from({ length: 20 }, (_, i) => {
      const d = new Date(now - (19 - i) * 3000);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    });

    this.telemetryChart = makeLineChart('cc-telemetry-chart', labels, [
      {
        label: 'Water Level (%)',
        data: Array(20).fill(null).map(() => 30 + Math.random() * 20),
        borderColor: CHART_COLORS.cyan,
        backgroundColor: 'rgba(0,180,216,0.08)'
      },
      {
        label: 'Plastic Burden (%)',
        data: Array(20).fill(null).map(() => 60 + Math.random() * 30),
        borderColor: CHART_COLORS.critical,
        backgroundColor: 'rgba(229,62,62,0.06)'
      },
      {
        label: 'Flow Rate (L/s)',
        data: Array(20).fill(null).map(() => 40 + Math.random() * 20),
        borderColor: CHART_COLORS.primary,
        backgroundColor: 'rgba(0,200,150,0.06)'
      }
    ], { legend: true });
  },

  _renderPriorityAlerts(hotspots) {
    const container = document.getElementById('cc-priority-alerts');
    if (!container) return;

    const top = [...hotspots].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 4);

    // Update Decision Summary card with the top priority site
    if (top.length > 0) {
      const topH = top[0];
      const decNode = document.getElementById('cc-dec-node');
      const decScore = document.getElementById('cc-dec-score');
      const decTag = document.getElementById('cc-dec-tag');
      const decSev = document.getElementById('cc-dec-sev');
      const decPer = document.getElementById('cc-dec-per');
      const decExp = document.getElementById('cc-dec-exp');
      const decFea = document.getElementById('cc-dec-fea');

      if (decNode) decNode.textContent = `${topH.nodeId} (${topH.name})`;
      if (decScore) {
        decScore.innerHTML = `${topH.priorityScore} <span style="font-size:11px;color:var(--text-muted);font-weight:500;">/ 100</span>`;
        decScore.style.color = topH.priorityScore >= 70 ? 'var(--status-critical)' : topH.priorityScore >= 40 ? 'var(--status-high)' : 'var(--accent-primary)';
      }
      if (decTag) {
        decTag.textContent = topH.recommendation || (topH.priorityScore >= 70 ? 'ACT NOW' : topH.priorityScore >= 40 ? 'VERIFY' : 'MONITOR');
        decTag.className = 'recommendation-tag ' + (topH.priorityScore >= 70 ? 'act-now' : topH.priorityScore >= 40 ? 'verify' : 'monitor');
      }
      if (decSev) decSev.textContent = (topH.severity || 0).toFixed(2);
      if (decPer) decPer.textContent = (topH.persistence || 0).toFixed(2);
      if (decExp) decExp.textContent = (topH.exposure || 0).toFixed(2);
      if (decFea) decFea.textContent = (topH.feasibility || 0).toFixed(2);
    }

    container.innerHTML = top.map(h => `
      <div class="priority-card ${h.status}" onclick="CommandCenter._showNodeDetail('${h.nodeId}')">
        <div class="priority-card-header">
          <span class="priority-node-id">${h.nodeId}</span>
          <span class="priority-score-badge ${h.status}">${h.priorityScore} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">/ 100</span></span>
        </div>
        <div class="priority-location">${h.name}</div>
        <div class="priority-metrics">
          <div class="metric-pill">Burden: <span>${fmtBurdenText(h.severity)}</span></div>
          <div class="metric-pill">Recurrence: <span>${h.recurrenceCount || 0}/24h</span></div>
          <div class="metric-pill">Exposure: <span>${fmtBurdenText(h.exposure)}</span></div>
          <div class="metric-pill">Feasibility: <span>${Math.round((h.feasibility || 0) * 100)}%</span></div>
        </div>
        <div class="flex items-center justify-between">
          ${recommendationTag(h.recommendation || 'MONITOR')}
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); navigateTo('hotspot-intelligence')">View Intelligence</button>
        </div>
      </div>
    `).join('');
  },

  _renderAlerts(events) {
    const container = document.getElementById('cc-event-log');
    if (!container) return;
    if (!events?.length) {
      container.innerHTML = '<div class="text-muted text-sm" style="padding:8px;">Awaiting events...</div>';
      return;
    }
    container.innerHTML = events.slice(0, 8).map(e => `
      <div class="event-entry">
        <span class="event-time">${formatTime(e.timestamp)}</span>
        <span class="event-node ${e.type}">${e.nodeId}</span>
        <span class="event-msg">${e.message}</span>
      </div>
    `).join('');
  },

  _renderEventLog(events) { this._renderAlerts(events); },

  _onSensorUpdate(data) {
    if (!data?.nodes?.length) return;
    // Use OUT-07 (highest priority) for main telemetry
    const node07 = data.nodes.find(n => n.id === 'OUT-07') || data.nodes[0];
    if (node07?.sensors) {
      this._renderTelemetry(node07.sensors);
      // Update chart
      if (this.telemetryChart && AppState.simActive) {
        const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        addDataPoint(this.telemetryChart, time, [
          node07.sensors.waterLevel,
          node07.sensors.plasticBurden * 100,
          node07.sensors.flow
        ], 30);
      }
    }
  },

  _onHotspotUpdate(data) {
    if (!data?.hotspots) return;
    this.hotspotsData = data.hotspots;
    MapModule.renderHotspots('cc-map', this.hotspotsData);
    this._renderPriorityAlerts(this.hotspotsData);
  },

  _onKpiUpdate(data) {
    if (data?.kpis) this._renderKPIs(data.kpis);
  },

  _onEventLog(data) {
    if (data?.event) {
      AppState.addEvent(data.event);
      const events = AppState.eventLog;
      this._renderAlerts(events);

      // Show toast for critical events
      if (data.event.type === 'critical') {
        Toast.show('critical', data.event.nodeId, data.event.message, 5000);
      } else if (data.event.type === 'warning') {
        Toast.show('warning', data.event.nodeId, data.event.message, 4000);
      }
    }
  },

  _showNodeDetail(nodeId) {
    AppState.update('selectedNodeId', nodeId);
    MapModule.focusNode('cc-map', nodeId, this.hotspotsData);
  }
};

function fmtBurdenText(val) {
  if (val >= 0.75) return 'HIGH';
  if (val >= 0.5) return 'MEDIUM';
  return 'LOW';
}

window.CommandCenter = CommandCenter;
