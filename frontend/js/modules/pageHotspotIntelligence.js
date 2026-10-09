/**
 * COASTGUARD - Hotspot Intelligence Page
 * GIS intelligence view with filters and drill-down panels.
 */

const HotspotIntelligence = {
  map: null,
  hotspotsData: [],
  currentFilter: 'all',
  selectedHotspot: null,

  async init() {
    this.map = MapModule.initMap('hotspot-map', { zoom: 11 });
    MapModule.onMarkerClick((nodeId) => this._showIntelPanel(nodeId));

    try {
      const res = await API.getHotspots();
      if (res.data) {
        this.hotspotsData = res.data;
        MapModule.renderHotspots('hotspot-map', this.hotspotsData);
        this._renderList(this.hotspotsData);
      }
    } catch (e) { console.error('[HS] Init error:', e); }

    // Subscribe
    CGSocket.on('hotspot_update', (data) => {
      if (data?.hotspots) {
        this.hotspotsData = data.hotspots;
        MapModule.renderHotspots('hotspot-map', this.hotspotsData);
        this._renderList(this._filterHotspots(this.hotspotsData));
        // Refresh intel panel if open
        if (this.selectedHotspot) {
          const updated = this.hotspotsData.find(h => h.nodeId === this.selectedHotspot.nodeId);
          if (updated) this._showIntelPanel(updated.nodeId);
        }
      }
    });
  },

  _filterHotspots(hotspots) {
    if (this.currentFilter === 'all') return hotspots;
    return hotspots.filter(h => h.status === this.currentFilter);
  },

  setFilter(filter) {
    this.currentFilter = filter;
    // Update buttons
    document.querySelectorAll('.hs-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this._renderList(this._filterHotspots(this.hotspotsData));
  },

  _renderList(hotspots) {
    const container = document.getElementById('hotspot-list');
    if (!container) return;

    if (!hotspots.length) {
      container.innerHTML = '<div class="text-muted text-sm" style="padding:16px;text-align:center;">No hotspots match filter</div>';
      return;
    }

    container.innerHTML = hotspots.map(h => `
      <div class="priority-card ${h.status}" style="margin-bottom:8px;" onclick="HotspotIntelligence._showIntelPanel('${h.nodeId}')">
        <div class="priority-card-header">
          <span class="priority-node-id">${h.nodeId}</span>
          <div class="flex items-center gap-sm">
            ${statusBadge(h.status)}
            <span class="priority-score-badge ${h.status}">${h.priorityScore}</span>
          </div>
        </div>
        <div class="priority-location">${h.name}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">${h.location || ''}</div>
        <div class="priority-metrics">
          <div class="metric-pill">Severity: <span>${Math.round((h.severity || 0) * 100)}%</span></div>
          <div class="metric-pill">Persistence: <span>${Math.round((h.persistence || 0) * 100)}%</span></div>
          <div class="metric-pill">Exposure: <span>${Math.round((h.exposure || 0) * 100)}%</span></div>
          <div class="metric-pill">Feasibility: <span>${Math.round((h.feasibility || 0) * 100)}%</span></div>
        </div>
        <div class="flex items-center justify-between">
          ${recommendationTag(h.recommendation || 'MONITOR')}
          <span class="text-muted text-xs">↩ ${h.recurrenceCount || 0} events/24h</span>
        </div>
      </div>
    `).join('');
  },

  _showIntelPanel(nodeId) {
    const hotspot = this.hotspotsData.find(h => h.nodeId === nodeId);
    if (!hotspot) return;
    this.selectedHotspot = hotspot;

    const panel = document.getElementById('hotspot-intel-panel');
    if (!panel) return;

    const scoreColor = hotspot.status === 'critical' ? 'var(--status-critical)' :
      hotspot.status === 'high' ? 'var(--status-high)' : 'var(--accent-primary)';

    panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">INTELLIGENCE — ${nodeId}</span>
        <button class="btn btn-ghost btn-sm" onclick="HotspotIntelligence._closePanel()">✕</button>
      </div>
      <div class="panel-body">
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">${hotspot.location || ''}</div>
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${hotspot.name}</div>
        </div>

        <div class="score-display" style="padding:16px 8px;">
          <div class="score-circle ${hotspot.status}">
            <div class="score-number" style="color:${scoreColor};">${hotspot.priorityScore}</div>
            <div class="score-label">/ 100</div>
          </div>
          <div style="margin-top:8px;">${recommendationTag(hotspot.recommendation || 'MONITOR')}</div>
        </div>

        <div style="margin-bottom:12px;">
          <div class="progress-bar-container">
            <div class="progress-label"><span>SEVERITY</span><span>${Math.round((hotspot.severity||0)*100)}%</span></div>
            <div class="progress-track"><div class="progress-fill critical" style="width:${Math.round((hotspot.severity||0)*100)}%"></div></div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-label"><span>PERSISTENCE</span><span>${Math.round((hotspot.persistence||0)*100)}%</span></div>
            <div class="progress-track"><div class="progress-fill warning" style="width:${Math.round((hotspot.persistence||0)*100)}%"></div></div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-label"><span>EXPOSURE</span><span>${Math.round((hotspot.exposure||0)*100)}%</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${Math.round((hotspot.exposure||0)*100)}%"></div></div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-label"><span>RECOVERY FEASIBILITY</span><span>${Math.round((hotspot.feasibility||0)*100)}%</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${Math.round((hotspot.feasibility||0)*100)}%;background:linear-gradient(90deg,var(--accent-cyan),#1a6fa8)"></div></div>
          </div>
        </div>

        <!-- TEMPORAL INTELLIGENCE (Section 7 & 8) -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:var(--radius-sm);padding:10px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:9px;font-weight:700;letter-spacing:1px;color:var(--text-muted);text-transform:uppercase;">TEMPORAL INTELLIGENCE</span>
            <span class="badge ${hotspot.trend === 'INCREASING' ? 'badge-critical' : 'badge-online'}" style="font-size:8px;">${hotspot.trend || 'INCREASING'}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;margin-bottom:8px;">
            <div><span style="color:var(--text-muted);">Recurrence:</span> <strong style="color:var(--status-critical);">${hotspot.recurrenceCount || 8} events / 24h</strong></div>
            <div><span style="color:var(--text-muted);">Env Correlation:</span> <strong style="color:var(--accent-primary);">${hotspot.environmentalCorrelation || '+0.89'}</strong></div>
            <div><span style="color:var(--text-muted);">First Detected:</span> <strong>${hotspot.firstDetected ? formatDateTime(hotspot.firstDetected).split(',')[0] : '2024-01-15'}</strong></div>
            <div><span style="color:var(--text-muted);">Confidence:</span> <strong style="color:var(--accent-primary);">${hotspot.confidence || 92}%</strong></div>
          </div>
          <div style="font-size:10px;color:var(--text-secondary);line-height:1.4;border-top:1px solid #e2e8f0;padding-top:6px;font-style:italic;">
            "Repeated observations increase confidence that this is a persistent leakage hotspot rather than a one-time transient event."
          </div>
        </div>

        <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:10px;margin-bottom:12px;font-size:11px;color:var(--text-secondary);line-height:1.6;">
          <div style="font-size:9px;font-weight:600;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px;">DECISION BASIS</div>
          ${this._buildDecisionExplanation(hotspot)}
        </div>

        <div style="display:flex;flex-direction:column;gap:6px;">
          <button class="btn btn-critical btn-sm" onclick="HotspotIntelligence._dispatchIntervention('${nodeId}')">
            🚨 Dispatch Rapid Response Team
          </button>
          <button class="btn btn-outline btn-sm" onclick="navigateTo('decision-engine')">
            📊 View Decision Engine Analysis
          </button>
        </div>
      </div>
    `;

    panel.style.display = 'block';
    MapModule.focusNode('hotspot-map', nodeId, this.hotspotsData);
  },

  _buildDecisionExplanation(h) {
    const parts = [];
    if (h.severity > 0.7) parts.push('High plastic burden confirmed');
    if (h.persistence > 0.6) parts.push('Recurring detection events');
    if (h.exposure > 0.7) parts.push('High ecosystem exposure risk');
    if (h.feasibility > 0.7) parts.push('Field intervention feasible');
    if (!parts.length) parts.push('Environmental monitoring recommended');
    return parts.join(' · ');
  },

  _closePanel() {
    const panel = document.getElementById('hotspot-intel-panel');
    if (panel) panel.style.display = 'none';
    this.selectedHotspot = null;
  },

  async _dispatchIntervention(nodeId) {
    const hotspot = this.hotspotsData.find(h => h.nodeId === nodeId);
    try {
      await API.createIntervention({
        nodeId,
        reason: this._buildDecisionExplanation(hotspot),
        recommendedAction: hotspot?.priorityScore >= 70 ? 'Deploy boom interceptor + manual collection team' : 'Field team inspection',
        assignedTeam: 'Field Team Alpha'
      });
      Toast.show('info', 'Intervention Dispatched', `Field team dispatched to ${hotspot?.name || nodeId}`);
      this._closePanel();
      navigateTo('interventions');
    } catch (e) {
      Toast.show('critical', 'Error', 'Failed to dispatch intervention');
    }
  }
};

window.HotspotIntelligence = HotspotIntelligence;
