/**
 * COASTGUARD - Recovery & Circularity Page
 * Tracks collected materials and circular recovery pathways.
 */

const RecoveryCircularity = {
  records: [],
  materialChart: null,
  pathwayChart: null,

  async init() {
    await this.loadRecords();
    CGSocket.on('recovery_update', () => this.loadRecords());
  },

  async loadRecords() {
    try {
      const res = await API.getRecovery();
      if (res.data) {
        this.records = res.data;
        this._renderSummary();
        this._renderTraceability();
        this._renderRecords();
        this._renderCharts();
      }
    } catch (e) { console.error('[RC] Load error:', e); }
  },

  _renderSummary() {
    const totalKg = this.records.reduce((sum, r) => sum + (r.collectedKg || 0), 0);
    const materialTotals = {};
    this.records.forEach(r => {
      Object.entries(r.materials || {}).forEach(([mat, kg]) => {
        materialTotals[mat] = (materialTotals[mat] || 0) + kg;
      });
    });

    const recoverableKg = Math.round(totalKg * 0.85);
    const pathwayTotals = { Recycling: 0, 'Material Recovery': 0, Upcycling: 0, 'Safe Disposal': 0 };
    this.records.forEach(r => {
      Object.entries(r.recoveryPathway || {}).forEach(([path, pct]) => {
        pathwayTotals[path] = (pathwayTotals[path] || 0) + (r.collectedKg * pct / 100);
      });
    });

    const summaryEl = document.getElementById('rc-summary');
    if (!summaryEl) return;

    const petKg = Math.round(materialTotals['PET'] || 0);
    const hdpeKg = Math.round(materialTotals['HDPE'] || 0);
    const flexKg = Math.round((materialTotals['Flexible Plastic'] || 0) + (materialTotals['LDPE'] || 0));
    const mixedKg = Math.round(materialTotals['Mixed Plastic'] || 0);

    summaryEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px;">
        <div class="metric-card" style="border-top:3px solid var(--accent-primary);">
          <div class="metric-card-value">${totalKg} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">kg</span></div>
          <div class="metric-card-label">RECOVERED TOTAL</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-value" style="color:#0f766e;">${petKg} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">kg</span></div>
          <div class="metric-card-label">PET PLASTIC</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-value" style="color:#0284c7;">${hdpeKg} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">kg</span></div>
          <div class="metric-card-label">HDPE RIGID</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-value" style="color:#38bdf8;">${flexKg} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">kg</span></div>
          <div class="metric-card-label">FLEXIBLE PLASTIC</div>
        </div>
        <div class="metric-card">
          <div class="metric-card-value" style="color:#ea580c;">${mixedKg} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">kg</span></div>
          <div class="metric-card-label">MIXED PLASTIC</div>
        </div>
      </div>

      <!-- Material breakdown -->
      <div class="panel mb-md">
        <div class="panel-header"><span class="panel-title">MATERIAL CLASSIFICATION & SEGREGATION</span><span class="sim-badge">SIMULATED DATA</span></div>
        <div class="panel-body">
          ${Object.entries(materialTotals).map(([mat, kg], i) => {
            const classes = ['pet', 'hdpe', 'ldpe', 'mixed', 'other'];
            const pct = totalKg > 0 ? Math.round(kg / totalKg * 100) : 0;
            return `
              <div class="material-row">
                <div class="material-name">${mat}</div>
                <div class="material-bar"><div class="material-fill ${classes[i] || 'mixed'}" style="width:${pct}%"></div></div>
                <div class="material-value">${Math.round(kg)} kg</div>
                <div style="font-size:10px;color:var(--text-muted);width:36px;text-align:right;">${pct}%</div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Recovery pathways -->
      <div class="panel">
        <div class="panel-header"><span class="panel-title">CIRCULAR RECOVERY PATHWAYS</span></div>
        <div class="panel-body">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
            ${Object.entries(pathwayTotals).filter(([_, v]) => v > 0).map(([path, kg]) => {
              const colors = { Recycling: 'var(--accent-primary)', 'Material Recovery': 'var(--accent-cyan)', Upcycling: '#7c3aed', 'Safe Disposal': '#64748b' };
              return `
                <div style="background:#ffffff;border-radius:var(--radius-md);padding:14px;text-align:center;border:1px solid #e2e8f0;box-shadow:var(--shadow-card);">
                  <div style="font-size:9px;font-weight:700;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px;">${path.toUpperCase()}</div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:800;color:${colors[path] || 'var(--accent-primary)'};">${Math.round(kg)} kg</div>
                  <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${totalKg > 0 ? Math.round(kg/totalKg*100) : 0}% of recovery</div>
                </div>`;
            }).join('')}
          </div>
          <div style="margin-top:12px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:var(--radius-sm);font-size:11px;color:var(--text-muted);">
            Suitable material is routed to the appropriate recovery pathway. Contaminated or non-recyclable fractions are safely routed to municipal disposal.
          </div>
        </div>
      </div>
    `;
  },

  _renderTraceability() {
    const container = document.getElementById('rc-traceability');
    if (!container || !this.records.length) return;

    const latest = this.records[0];
    const traceSteps = [
      'Hotspot (Source)',
      'Intervention',
      'Collection',
      'Classification',
      'Quantity Audit',
      'Circular Routing',
      'Verification'
    ];
    container.innerHTML = `
      <div class="panel-header"><span class="panel-title">CIRCULAR TRACEABILITY CHAIN — ${latest.nodeId}</span><span class="badge badge-online">VERIFIED RECOVERY</span></div>
      <div class="panel-body">
        <div style="display:flex;align-items:center;gap:0;flex-wrap:wrap;row-gap:8px;">
          ${traceSteps.map((step, i, arr) => `
            <div style="display:flex;align-items:center;">
              <div style="
                padding:8px 12px;
                background:${i <= 5 ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)'};
                border:1px solid ${i <= 5 ? 'var(--accent-primary)' : 'var(--border-subtle)'};
                border-radius:var(--radius-sm);
                font-size:10px;
                font-weight:600;
                color:${i <= 5 ? 'var(--accent-primary)' : 'var(--text-muted)'};
                text-align:center;
                min-width:85px;
              ">
                <div style="font-size:9px;opacity:0.6;margin-bottom:2px;">0${i+1}</div>
                ${step}
                ${i <= 5 ? '<div style="font-size:8px;margin-top:2px;color:rgba(0,200,150,0.8);">✓ VERIFIED</div>' : ''}
              </div>
              ${i < arr.length - 1 ? '<div style="color:var(--text-muted);padding:0 4px;font-size:14px;">→</div>' : ''}
            </div>
          `).join('')}
        </div>
        <div style="margin-top:12px;padding:10px;background:var(--bg-elevated);border-radius:var(--radius-sm);font-size:11px;color:var(--text-secondary);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>Source Hotspot: <strong>${latest.siteName} (${latest.nodeId})</strong> · Linked Intervention: <strong style="color:var(--accent-primary);">${latest.interventionId || 'INT-MITHI-01'}</strong> · Quantity: <strong>${latest.collectedKg} kg</strong> · Timestamp: <strong>${formatDateTime(latest.collectedAt)}</strong></div>
          <div style="font-size:10px;color:var(--text-muted);font-style:italic;">Proposed circular recovery pathways · Verified software chain</div>
        </div>
      </div>
    `;
  },

  _renderRecords() {
    const container = document.getElementById('rc-records');
    if (!container) return;

    container.innerHTML = `
      <table class="data-table" style="width:100%;">
        <thead>
          <tr>
            <th>NODE</th><th>SITE</th><th>COLLECTED</th><th>PET</th><th>HDPE</th><th>MIXED</th><th>PATHWAY</th><th>DATE</th>
          </tr>
        </thead>
        <tbody>
          ${this.records.map(r => `
            <tr>
              <td class="text-mono text-accent">${r.nodeId}</td>
              <td>${r.siteName}</td>
              <td class="text-mono font-bold">${r.collectedKg} kg</td>
              <td>${r.materials?.PET || 0} kg</td>
              <td>${r.materials?.HDPE || 0} kg</td>
              <td>${r.materials?.['Mixed Plastic'] || 0} kg</td>
              <td>${Object.entries(r.recoveryPathway || {}).sort((a,b) => b[1]-a[1])[0]?.[0] || '—'}</td>
              <td>${formatDateTime(r.collectedAt)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  _renderCharts() {
    // Destroy existing charts
    if (this.materialChart) { this.materialChart.destroy(); this.materialChart = null; }
    if (this.pathwayChart) { this.pathwayChart.destroy(); this.pathwayChart = null; }

    const totalKg = this.records.reduce((sum, r) => sum + r.collectedKg, 0);
    const materialTotals = {};
    this.records.forEach(r => {
      Object.entries(r.materials || {}).forEach(([mat, kg]) => {
        materialTotals[mat] = (materialTotals[mat] || 0) + kg;
      });
    });

    if (Object.keys(materialTotals).length) {
      this.materialChart = makeDoughnutChart(
        'rc-material-chart',
        Object.keys(materialTotals),
        Object.values(materialTotals),
        ['#00c896', '#00b4d8', '#63b3ed', '#f6ad55', '#68d391']
      );
    }
  }
};

window.RecoveryCircularity = RecoveryCircularity;
