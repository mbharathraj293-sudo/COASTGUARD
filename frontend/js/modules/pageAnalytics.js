/**
 * COASTGUARD - Analytics Page
 * Professional data visualization and performance metrics.
 */

const Analytics = {
  charts: {},

  async init() {
    try {
      const res = await API.getAnalytics();
      if (res.data) this._renderAll(res.data);
    } catch (e) { console.error('[Analytics] Init error:', e); }
  },

  _renderAll(data) {
    this._renderMetrics(data);
    this._destroyCharts();
    this._renderTrendChart(data.trend7Day || []);
    this._render24hChart(data.trend24h || []);
    this._renderHotspotRanking(data.ranking || []);
    this._renderMaterialChart(data.materialDistribution || {});
  },

  _renderMetrics(data) {
    const el = id => document.getElementById(id);
    const setEl = (id, val) => { if (el(id)) el(id).textContent = val; };

    setEl('an-total-recovery', `${data.totalRecoveryKg || 211} kg`);
    setEl('an-response-time', `${data.avgResponseTime || 62} min`);
    setEl('an-accuracy', `${data.detectionAccuracy || 91}%`);
    setEl('an-uptime', `${data.sensorUptime || 87}%`);
  },

  _renderTrendChart(trend) {
    const labels = trend.map(d => d.date);
    this.charts.trend = makeLineChart('an-trend-chart', labels, [
      {
        label: 'Plastic Detected (index)',
        data: trend.map(d => d.plastic),
        borderColor: CHART_COLORS.critical,
        backgroundColor: 'rgba(229,62,62,0.08)'
      },
      {
        label: 'Recovery (kg)',
        data: trend.map(d => d.recovery),
        borderColor: CHART_COLORS.primary,
        backgroundColor: 'rgba(0,200,150,0.06)'
      }
    ]);
  },

  _render24hChart(trend) {
    const labels = trend.map(d => d.hour);
    const data = trend.map(d => d.burden);
    this.charts.h24 = makeBarChart('an-24h-chart', labels, [{
      label: 'Plastic Burden Index',
      data,
      backgroundColor: data.map(v => v > 60 ? 'rgba(229,62,62,0.6)' : v > 40 ? 'rgba(246,173,85,0.6)' : 'rgba(0,200,150,0.5)'),
      borderRadius: 3
    }]);
  },

  _renderHotspotRanking(ranking) {
    const container = document.getElementById('an-ranking');
    if (!container) return;
    container.innerHTML = ranking.slice(0, 8).map((h, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
        <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);width:20px;">${String(i + 1).padStart(2, '0')}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--accent-primary);width:60px;">${h.id}</span>
        <div style="flex:1;height:6px;background:var(--bg-elevated);border-radius:99px;overflow:hidden;">
          <div style="width:${h.score}%;height:100%;background:${h.score>=70?'#e53e3e':h.score>=45?'#f6ad55':'#00c896'};border-radius:99px;transition:width 0.5s;"></div>
        </div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;min-width:30px;text-align:right;color:${h.score>=70?'var(--status-critical)':h.score>=45?'var(--status-high)':'var(--accent-primary)'};">${h.score}</span>
        <span style="font-size:10px;color:var(--text-muted);">/ 100</span>
      </div>
    `).join('');
  },

  _renderMaterialChart(materials) {
    if (!Object.keys(materials).length) return;
    if (this.charts.material) { this.charts.material.destroy(); }
    this.charts.material = makeDoughnutChart(
      'an-material-chart',
      Object.keys(materials),
      Object.values(materials),
      ['#00c896', '#00b4d8', '#63b3ed', '#f6ad55', '#68d391']
    );
  },

  _destroyCharts() {
    Object.values(this.charts).forEach(c => { try { c?.destroy(); } catch(e) {} });
    this.charts = {};
  }
};

window.Analytics = Analytics;

/**
 * COASTGUARD - Field Nodes Page
 */
const FieldNodes = {
  nodesData: [],

  async init() {
    await this.loadNodes();
    CGSocket.on('sensor_update', (data) => {
      if (data?.nodes) {
        data.nodes.forEach(n => {
          const existing = this.nodesData.find(nd => nd.id === n.id);
          if (existing) Object.assign(existing, n);
        });
        this._renderNodes();
      }
    });
  },

  async loadNodes() {
    try {
      const res = await API.getNodes();
      if (res.data) {
        this.nodesData = res.data;
        this._renderNodes();
      }
    } catch (e) { console.error('[FN] Load error:', e); }
  },

  currentView: 'table',

  setView(view) {
    this.currentView = view;
    const tableWrap = document.getElementById('field-nodes-table-wrap');
    const gridWrap = document.getElementById('field-nodes-grid');
    const btnTable = document.getElementById('btn-node-view-table');
    const btnGrid = document.getElementById('btn-node-view-grid');

    if (tableWrap) tableWrap.style.display = view === 'table' ? 'block' : 'none';
    if (gridWrap) gridWrap.style.display = view === 'grid' ? 'grid' : 'none';
    if (btnTable) btnTable.className = view === 'table' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
    if (btnGrid) btnGrid.className = view === 'grid' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  },

  _renderNodes() {
    this._renderTable();
    this._renderCards();
  },

  _renderTable() {
    const tbody = document.getElementById('field-nodes-tbody');
    if (!tbody) return;

    if (!this.nodesData.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;" class="text-muted">No nodes found</td></tr>';
      return;
    }

    tbody.innerHTML = this.nodesData.map(node => {
      const s = node.sensors || {};
      const burdenVal = typeof s.plasticBurden === 'number' ? (s.plasticBurden * 100).toFixed(0) : '--';
      const burdenCls = (s.plasticBurden || 0) > 0.7 ? 'text-critical font-bold' : (s.plasticBurden || 0) > 0.4 ? 'text-warning font-bold' : 'text-accent font-bold';

      return `
        <tr onclick="FieldNodes._showNodeDetail('${node.id}')" style="cursor:pointer;">
          <td class="text-mono font-bold text-accent">${node.id}</td>
          <td>
            <div style="font-weight:600;color:var(--text-primary);">${node.name}</div>
            <div style="font-size:10px;color:var(--text-muted);">${node.location}</div>
          </td>
          <td>${statusBadge(node.status || 'online')}</td>
          <td class="text-mono">${typeof s.waterLevel === 'number' ? s.waterLevel.toFixed(1) + '%' : '--'}</td>
          <td class="text-mono">${typeof s.flow === 'number' ? s.flow.toFixed(1) + ' L/s' : '--'}</td>
          <td class="text-mono ${burdenCls}">${burdenVal}%</td>
          <td class="text-mono">📡 ${Math.round(s.signal || 0)}%</td>
          <td style="font-size:10px;color:var(--text-muted);">${this._timeAgo(node.lastHeartbeat)}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); FieldNodes._showNodeDetail('${node.id}')">Details</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  _renderCards() {
    const container = document.getElementById('field-nodes-grid');
    if (!container) return;

    container.innerHTML = this.nodesData.map(node => {
      const s = node.sensors || {};
      return `
        <div class="node-card ${node.status || 'online'}" onclick="FieldNodes._showNodeDetail('${node.id}')">
          <div class="node-card-header">
            <span class="node-id">${node.id}</span>
            ${statusBadge(node.status || 'online')}
          </div>
          <div style="font-size:11px;font-weight:600;color:var(--text-primary);margin-bottom:2px;">${node.name}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:10px;">${node.location}</div>
          
          <div class="node-sensor-grid">
            <div class="node-sensor">
              <div class="node-sensor-label">Water Level</div>
              <div class="node-sensor-value">${typeof s.waterLevel === 'number' ? s.waterLevel.toFixed(1) : '--'}%</div>
            </div>
            <div class="node-sensor">
              <div class="node-sensor-label">Flow Rate</div>
              <div class="node-sensor-value">${typeof s.flow === 'number' ? s.flow.toFixed(1) : '--'} L/s</div>
            </div>
            <div class="node-sensor">
              <div class="node-sensor-label">Rainfall</div>
              <div class="node-sensor-value">${typeof s.rainfall === 'number' ? s.rainfall.toFixed(1) : '--'} mm/h</div>
            </div>
            <div class="node-sensor">
              <div class="node-sensor-label">Plastic Burden</div>
              <div class="node-sensor-value ${(s.plasticBurden || 0) > 0.7 ? 'text-critical font-bold' : (s.plasticBurden || 0) > 0.4 ? 'text-warning font-bold' : 'text-accent font-bold'}">
                ${typeof s.plasticBurden === 'number' ? (s.plasticBurden * 100).toFixed(0) : '--'}%
              </div>
            </div>
          </div>
          
          <div style="margin-top:10px;display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);">
            <span>🔋 ${Math.round(s.battery || 0)}%</span>
            <span>📡 ${Math.round(s.signal || 0)}%</span>
            <span>♥ ${this._timeAgo(node.lastHeartbeat)}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  _timeAgo(isoStr) {
    if (!isoStr) return 'N/A';
    const diff = (Date.now() - new Date(isoStr)) / 1000;
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${Math.round(diff)}s ago`;
    return `${Math.round(diff / 60)}m ago`;
  },

  _showNodeDetail(nodeId) {
    const node = this.nodesData.find(n => n.id === nodeId);
    if (!node) return;

    const panel = document.getElementById('node-detail-panel');
    if (!panel) return;

    const s = node.sensors || {};
    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <span class="text-mono text-accent" style="font-size:14px;font-weight:800;">${node.id} — ${node.name}</span>
          <span style="font-size:11px;color:var(--text-muted);margin-left:8px;">${node.location}</span>
        </div>
        <div class="flex items-center gap-sm">
          ${statusBadge(node.status || 'online')}
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('node-detail-panel').style.display='none'">✕ Close</button>
        </div>
      </div>
      <div class="panel-body">
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px;">
          <div class="metric-card">
            <div class="metric-card-value">${typeof s.waterLevel === 'number' ? s.waterLevel.toFixed(1) : '--'}%</div>
            <div class="metric-card-label">WATER LEVEL</div>
          </div>
          <div class="metric-card">
            <div class="metric-card-value">${typeof s.flow === 'number' ? s.flow.toFixed(1) : '--'} L/s</div>
            <div class="metric-card-label">FLOW RATE</div>
          </div>
          <div class="metric-card">
            <div class="metric-card-value">${typeof s.rainfall === 'number' ? s.rainfall.toFixed(1) : '--'} mm/h</div>
            <div class="metric-card-label">RAINFALL</div>
          </div>
          <div class="metric-card">
            <div class="metric-card-value" style="color:${(s.plasticBurden || 0) > 0.7 ? 'var(--status-critical)' : 'var(--accent-primary)'};">${typeof s.plasticBurden === 'number' ? (s.plasticBurden * 100).toFixed(0) : '--'}%</div>
            <div class="metric-card-label">PLASTIC BURDEN</div>
          </div>
          <div class="metric-card">
            <div class="metric-card-value">${Math.round(s.battery || 0)}%</div>
            <div class="metric-card-label">BATTERY</div>
          </div>
          <div class="metric-card">
            <div class="metric-card-value">${Math.round(s.signal || 0)}%</div>
            <div class="metric-card-label">SIGNAL / LORA</div>
          </div>
        </div>

        <div class="two-col-equal">
          <div style="background:#f8fafc;padding:12px;border-radius:var(--radius-md);border:1px solid #e2e8f0;">
            <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px;">NODE ARCHITECTURE & TELEMETRY PROFILE</div>
            <div style="font-size:11px;color:var(--text-secondary);line-height:1.6;">
              Hardware Target: ESP32-S3 Dual-Core Xtensa LX7 MCU · Sub-GHz LoRa / 4G NB-IoT Gateway<br>
              Sensors: Ultrasonic level sensor, Doppler flow velocity, Optical camera probe, Optical turbidity probe<br>
              Last Heartbeat: ${this._timeAgo(node.lastHeartbeat)} (2.5s telemetry interval)
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
            <button class="btn btn-primary" onclick="AppState.update('selectedNodeId', '${node.id}'); navigateTo('live-monitoring')">
              📹 View Live Camera Surveillance
            </button>
            <button class="btn btn-outline" onclick="navigateTo('hotspot-intelligence')">
              🗺 Locate on Hotspot Map
            </button>
          </div>
        </div>
      </div>
    `;

    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });
  }
};

window.Analytics = Analytics;
window.FieldNodes = FieldNodes;
