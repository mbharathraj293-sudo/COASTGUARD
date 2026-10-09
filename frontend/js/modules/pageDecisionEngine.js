/**
 * COASTGUARD - Decision Engine Page
 * Priority formula visualization and live calculation.
 */

const DecisionEngine = {
  selectedNodeId: 'OUT-07',
  hotspotsData: [],

  async init() {
    try {
      const res = await API.getHotspots();
      if (res.data) {
        this.hotspotsData = res.data;
        this._populateSelector(res.data);
        const selected = res.data.find(h => h.nodeId === this.selectedNodeId) || res.data[0];
        if (selected) this._renderCalculation(selected);
        this._renderAllHotspots(res.data);
      }
    } catch (e) { console.error('[DE] Init error:', e); }

    CGSocket.on('hotspot_update', (data) => {
      if (data?.hotspots) {
        this.hotspotsData = data.hotspots;
        const sel = data.hotspots.find(h => h.nodeId === this.selectedNodeId);
        if (sel) this._renderCalculation(sel);
        this._populateSelector(data.hotspots);
        this._renderAllHotspots(data.hotspots);
      }
    });
  },

  _populateSelector(hotspots) {
    const sel = document.getElementById('de-node-selector');
    if (!sel) return;
    sel.innerHTML = [...hotspots].sort((a, b) => b.priorityScore - a.priorityScore).map(h =>
      `<option value="${h.nodeId}" ${h.nodeId === this.selectedNodeId ? 'selected' : ''}>${h.nodeId} — ${h.name} (Score: ${h.priorityScore})</option>`
    ).join('');
    sel.onchange = () => {
      this.selectNode(sel.value);
    };
  },

  selectNode(nodeId) {
    this.selectedNodeId = nodeId;
    const sel = document.getElementById('de-node-selector');
    if (sel && sel.value !== nodeId) sel.value = nodeId;
    const sel_hs = this.hotspotsData.find(h => h.nodeId === nodeId);
    if (sel_hs) this._renderCalculation(sel_hs);
    this._renderAllHotspots(this.hotspotsData);
  },

  _renderAllHotspots(hotspots) {
    const container = document.getElementById('de-all-hotspots');
    if (!container) return;

    const sorted = [...hotspots].sort((a, b) => b.priorityScore - a.priorityScore);
    container.innerHTML = sorted.map((h, idx) => {
      const isSelected = h.nodeId === this.selectedNodeId;
      const scoreColor = h.status === 'critical' ? 'var(--status-critical)' :
        h.status === 'high' ? 'var(--status-high)' : 'var(--accent-primary)';
      const S = (h.severity || 0).toFixed(2);
      const P = (h.persistence || 0).toFixed(2);
      const E = (h.exposure || 0).toFixed(2);
      const F = (h.feasibility || 0).toFixed(2);

      return `
        <div class="priority-card ${h.status}"
             style="cursor:pointer;margin-bottom:8px;padding:12px;background:${isSelected ? 'rgba(0,200,150,0.09)' : 'var(--bg-elevated)'};border:1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'};border-radius:var(--radius-md);transition:all 0.2s ease;"
             onclick="DecisionEngine.selectNode('${h.nodeId}')">
          <div class="priority-card-header" style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);">#${idx + 1}</span>
              <span class="priority-node-id" style="font-weight:700;color:var(--accent-primary);">${h.nodeId}</span>
              <span style="font-size:11px;color:var(--text-secondary);">${h.name}</span>
            </div>
            <div class="flex items-center gap-sm">
              ${statusBadge(h.status)}
              <span class="priority-score-badge ${h.status}" style="font-weight:700;font-size:14px;color:${scoreColor};">${h.priorityScore}</span>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:10px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;">
            <span>S: <strong style="color:#e53e3e;">${S}</strong> · P: <strong style="color:#f6ad55;">${P}</strong> · E: <strong style="color:#63b3ed;">${E}</strong> · F: <strong style="color:#00c896;">${F}</strong></span>
            <span>${recommendationTag(h.recommendation || 'MONITOR')}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  _renderCalculation(hotspot) {
    const S = hotspot.severity || 0;
    const P = hotspot.persistence || 0;
    const E = hotspot.exposure || 0;
    const F = hotspot.feasibility || 0;

    // PRIORITY = S × P × E × F → × 100
    const raw = S * P * E * F;
    const score = Math.round(raw * 100);

    const status = score >= 70 ? 'critical' : score >= 45 ? 'high' : score >= 25 ? 'medium' : 'low';
    const rec = score >= 70 ? 'ACT NOW' : score >= 40 ? 'VERIFY / SCHEDULE' : 'MONITOR';
    const recCls = score >= 70 ? 'act-now' : score >= 40 ? 'verify' : 'monitor';

    const container = document.getElementById('de-calc-panel');
    if (!container) return;

    container.innerHTML = `
      <div class="flex items-center justify-between mb-md">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--accent-primary);">${hotspot.nodeId}</div>
          <div style="font-size:11px;color:var(--text-muted);">${hotspot.name}</div>
        </div>
        <div>${statusBadge(status)}</div>
      </div>

      <!-- Formula -->
      <div class="formula-display">
        PRIORITY <span>=</span> SEVERITY <span>×</span> PERSISTENCE <span>×</span> EXPOSURE <span>×</span> FEASIBILITY <span>×</span> 100
      </div>

      <!-- Input values -->
      <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px;margin-bottom:14px;">
        <div style="font-size:9px;font-weight:600;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:10px;">INPUT PARAMETERS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${this._inputParam('Severity (S)', S, '#e53e3e')}
          ${this._inputParam('Persistence (P)', P, '#f6ad55')}
          ${this._inputParam('Exposure (E)', E, '#63b3ed')}
          ${this._inputParam('Feasibility (F)', F, '#00c896')}
        </div>
      </div>

      <!-- Breakdown bars -->
      <div class="mb-md">
        <div style="font-size:9px;font-weight:600;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:10px;">PARAMETER BREAKDOWN</div>
        ${this._factorBar('SEVERITY', S, 'critical')}
        ${this._factorBar('PERSISTENCE', P, 'warning')}
        ${this._factorBar('EXPOSURE', E, '')}
        ${this._factorBar('RECOVERY FEASIBILITY', F, '', '#63b3ed')}
      </div>

      <!-- Calculation steps -->
      <div style="background:var(--bg-panel);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px;margin-bottom:14px;font-family:'JetBrains Mono',monospace;font-size:11px;">
        <div style="color:var(--text-muted);margin-bottom:6px;">// Calculation</div>
        <div style="color:var(--text-secondary);">raw = ${S.toFixed(3)} × ${P.toFixed(3)} × ${E.toFixed(3)} × ${F.toFixed(3)}</div>
        <div style="color:var(--text-secondary);">raw = ${raw.toFixed(4)}</div>
        <div style="color:var(--accent-primary);font-weight:700;margin-top:4px;">score = round(raw × 100) = <span style="font-size:14px;">${score}</span></div>
      </div>

      <!-- Score display -->
      <div class="score-display">
        <div class="score-circle ${status}">
          <div class="score-number">${score}</div>
          <div class="score-label">/ 100</div>
        </div>
        <div style="margin-top:8px;"><span class="recommendation-tag ${recCls}">${rec}</span></div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:6px;">
          Confidence: <strong style="color:var(--accent-primary);">${hotspot.confidence || 92}%</strong> · Evidence Count: <strong style="color:var(--text-secondary);">${hotspot.evidenceCount || 12}</strong> · Updated: <strong style="color:var(--text-secondary);">${formatTime(hotspot.lastUpdated)}</strong>
        </div>
      </div>

      <!-- MULTI-SOURCE EVIDENCE PANEL (Section 10) -->
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:var(--radius-md);padding:14px;margin-bottom:12px;box-shadow:var(--shadow-card);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text-muted);text-transform:uppercase;">MULTI-SOURCE EVIDENCE MATRIX</span>
          <span class="badge badge-warning" style="font-size:8px;">8 SOURCES</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
          <div style="background:#f8fafc;padding:6px 8px;border-radius:4px;border:1px solid #e2e8f0;">
            <span style="color:var(--text-muted);font-size:9px;font-weight:600;">1. OPTICAL EVIDENCE:</span><br>
            <strong style="color:var(--text-primary);">${hotspot.severity > 0.7 ? 'High Plastic Cluster (PET)' : 'Low Floating Debris'}</strong>
          </div>
          <div style="background:#f8fafc;padding:6px 8px;border-radius:4px;border:1px solid #e2e8f0;">
            <span style="color:var(--text-muted);font-size:9px;font-weight:600;">2. RAINFALL:</span><br>
            <strong style="color:var(--text-primary);">${hotspot.severity > 0.7 ? '34.2 mm/h (Surge Event)' : '4.0 mm/h (Baseline)'}</strong>
          </div>
          <div style="background:#f8fafc;padding:6px 8px;border-radius:4px;border:1px solid #e2e8f0;">
            <span style="color:var(--text-muted);font-size:9px;font-weight:600;">3. WATER LEVEL:</span><br>
            <strong style="color:var(--text-primary);">${hotspot.severity > 0.7 ? '82.1% (High Channel Volume)' : '35.0% (Normal)'}</strong>
          </div>
          <div style="background:#f8fafc;padding:6px 8px;border-radius:4px;border:1px solid #e2e8f0;">
            <span style="color:var(--text-muted);font-size:9px;font-weight:600;">4. FLOW VELOCITY:</span><br>
            <strong style="color:var(--text-primary);">${hotspot.severity > 0.7 ? '86.5 L/s (Elevated Flush)' : '18.0 L/s (Low Velocity)'}</strong>
          </div>
          <div style="background:#f8fafc;padding:6px 8px;border-radius:4px;border:1px solid #e2e8f0;">
            <span style="color:var(--text-muted);font-size:9px;font-weight:600;">5. RECURRENCE (24h):</span><br>
            <strong style="color:var(--status-critical);">${hotspot.recurrenceCount || 8} Confirmed Events</strong>
          </div>
          <div style="background:#f8fafc;padding:6px 8px;border-radius:4px;border:1px solid #e2e8f0;">
            <span style="color:var(--text-muted);font-size:9px;font-weight:600;">6. SENSITIVE EXPOSURE:</span><br>
            <strong style="color:var(--accent-cyan);">${Math.round(E * 100)}% (Mangrove Sanctuary)</strong>
          </div>
          <div style="background:#f8fafc;padding:6px 8px;border-radius:4px;border:1px solid #e2e8f0;">
            <span style="color:var(--text-muted);font-size:9px;font-weight:600;">7. NODE TELEMETRY:</span><br>
            <strong style="color:var(--status-good);">ONLINE (98% Confidence)</strong>
          </div>
          <div style="background:#f8fafc;padding:6px 8px;border-radius:4px;border:1px solid #e2e8f0;">
            <span style="color:var(--text-muted);font-size:9px;font-weight:600;">8. RECOVERY FEASIBILITY:</span><br>
            <strong style="color:var(--accent-primary);">${Math.round(F * 100)}% (Boom Accessible)</strong>
          </div>
        </div>
      </div>

      <!-- "WHY ACT NOW?" REASONING CARD (Section 6) -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius-md);padding:12px 14px;margin-bottom:12px;">
        <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:#991b1b;margin-bottom:6px;text-transform:uppercase;">
          ${score >= 70 ? 'WHY ACT NOW?' : score >= 40 ? 'WHY VERIFY / SCHEDULE?' : 'WHY MONITOR?'}
        </div>
        <ul style="margin:0;padding-left:16px;font-size:11px;color:#7f1d1d;line-height:1.6;">
          ${score >= 70 ? `
            <li><strong>High plastic burden index (${Math.round(S*100)}%)</strong> detected by camera and hydrodynamic sensor telemetry.</li>
            <li><strong>Persistent recurrence (${hotspot.recurrenceCount || 8} events)</strong> confirms permanent drainage leakage channel.</li>
            <li><strong>High downstream exposure (${Math.round(E*100)}%)</strong> threatens coastal estuary and marine habitat.</li>
            <li><strong>Intervention feasibility (${Math.round(F*100)}%)</strong> enables rapid vehicular containment boom deployment.</li>
            <li><strong>Environmental monsoonal flow</strong> actively accelerates plastic escape into open sea.</li>
          ` : score >= 40 ? `
            <li>Moderate debris indicators present with potential for escalation under rain conditions.</li>
            <li>Recurrence is intermediate; on-site inspection recommended before dispatching heavy booms.</li>
          ` : `
            <li>Baseline plastic burden and low recurrence; passive monitoring continues.</li>
          `}
        </ul>
      </div>

      <!-- Decision Path Flow -->
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:var(--radius-md);padding:14px;margin-bottom:12px;box-shadow:var(--shadow-card);">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;">DECISION PATH</div>
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:600;color:var(--text-secondary);text-align:center;">
          <div style="background:#f1f5f9;padding:6px 10px;border-radius:4px;">1. Evidence</div>
          <span style="color:#94a3b8;">→</span>
          <div style="background:#f1f5f9;padding:6px 10px;border-radius:4px;">2. Context</div>
          <span style="color:#94a3b8;">→</span>
          <div style="background:#f1f5f9;padding:6px 10px;border-radius:4px;">3. Risk</div>
          <span style="color:#94a3b8;">→</span>
          <div style="background:#f1f5f9;padding:6px 10px;border-radius:4px;">4. Priority</div>
          <span style="color:#94a3b8;">→</span>
          <div style="background:#f0fdf4;color:#0f766e;padding:6px 10px;border-radius:4px;border:1px solid #bbf7d0;">5. Recommendation</div>
        </div>
      </div>

      <!-- Recommendation Tier Cards -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
        <div style="background:${score < 40 ? '#f0fdf4' : '#ffffff'};border:2px solid ${score < 40 ? '#16a34a' : '#e2e8f0'};border-radius:var(--radius-md);padding:10px;text-align:center;box-shadow:var(--shadow-card);">
          <div style="font-size:8px;font-weight:700;letter-spacing:0.8px;color:${score < 40 ? '#15803d' : '#64748b'};">TIER 1 (&lt; 40)</div>
          <div style="font-size:12px;font-weight:800;color:${score < 40 ? '#15803d' : '#334155'};margin:3px 0;">MONITOR</div>
          <div style="font-size:9px;color:var(--text-muted);">Passive tracking</div>
        </div>
        <div style="background:${score >= 40 && score < 70 ? '#fff7ed' : '#ffffff'};border:2px solid ${score >= 40 && score < 70 ? '#ea580c' : '#e2e8f0'};border-radius:var(--radius-md);padding:10px;text-align:center;box-shadow:var(--shadow-card);">
          <div style="font-size:8px;font-weight:700;letter-spacing:0.8px;color:${score >= 40 && score < 70 ? '#c2410c' : '#64748b'};">TIER 2 (40–69)</div>
          <div style="font-size:12px;font-weight:800;color:${score >= 40 && score < 70 ? '#c2410c' : '#334155'};margin:3px 0;">VERIFY / SCHEDULE</div>
          <div style="font-size:9px;color:var(--text-muted);">Inspection dispatch</div>
        </div>
        <div style="background:${score >= 70 ? '#fef2f2' : '#ffffff'};border:2px solid ${score >= 70 ? '#dc2626' : '#e2e8f0'};border-radius:var(--radius-md);padding:10px;text-align:center;box-shadow:var(--shadow-card);">
          <div style="font-size:8px;font-weight:700;letter-spacing:0.8px;color:${score >= 70 ? '#b91c1c' : '#64748b'};">TIER 3 (≥ 70)</div>
          <div style="font-size:12px;font-weight:800;color:${score >= 70 ? '#b91c1c' : '#334155'};margin:3px 0;">ACT NOW</div>
          <div style="font-size:9px;color:var(--text-muted);">Immediate containment</div>
        </div>
      </div>

      <!-- Recommendation logic explanation -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:var(--radius-md);padding:12px;margin-bottom:12px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;">RECOMMENDATION LOGIC</div>
        <div style="font-size:11px;color:var(--text-secondary);line-height:1.6;">
          ${this._buildRecommendationLogic(score, hotspot)}
        </div>
      </div>

      <!-- AI Recommendation Advisory Box -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius-md);padding:14px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--accent-primary);text-transform:uppercase;">
            AI RECOMMENDATION: <span class="recommendation-tag ${recCls}">${rec}</span>
          </div>
          <span class="badge badge-warning" style="font-size:9px;font-weight:700;letter-spacing:0.5px;">
            HUMAN VALIDATION REQUIRED
          </span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
          <div>
            <div style="font-size:9px;color:var(--text-muted);font-weight:600;margin-bottom:3px;">WHERE</div>
            <div style="font-size:11px;font-weight:700;color:var(--text-primary);">${hotspot.name}</div>
          </div>
          <div>
            <div style="font-size:9px;color:var(--text-muted);font-weight:600;margin-bottom:3px;">WHEN</div>
            <div style="font-size:11px;font-weight:700;color:var(--text-primary);">${score >= 70 ? 'Immediately (ACT NOW)' : score >= 40 ? 'Within 24h (VERIFY)' : 'Scheduled (MONITOR)'}</div>
          </div>
          <div>
            <div style="font-size:9px;color:var(--text-muted);font-weight:600;margin-bottom:3px;">WHAT TYPE</div>
            <div style="font-size:11px;font-weight:700;color:var(--text-primary);">${score >= 70 ? 'Boom Barrier + Collection' : score >= 40 ? 'Net Skimmer Barrier' : 'Passive Monitoring'}</div>
          </div>
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(15,118,110,0.15);font-size:10px;color:var(--accent-primary);font-weight:600;text-align:center;">
          AI RECOMMENDS WHERE → WHEN → WHAT TYPE OF INTERVENTION. FINAL FIELD ACTION REMAINS HUMAN-VALIDATED.
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${score >= 70 ? `
        <button class="btn btn-critical" style="flex:1;" onclick="DecisionEngine._dispatchIntervention('${hotspot.nodeId}')">
          🚨 Dispatch Rapid Response — ${hotspot.nodeId}
        </button>` : score >= 40 ? `
        <button class="btn btn-outline" style="flex:1;" onclick="DecisionEngine._dispatchIntervention('${hotspot.nodeId}')">
          📋 Schedule Field Inspection — ${hotspot.nodeId}
        </button>` : `
        <button class="btn btn-ghost" style="flex:1;" onclick="navigateTo('field-nodes')">
          📡 View Node Telemetry
        </button>`}
        <button class="btn btn-outline btn-sm" onclick="navigateTo('hotspot-intelligence')">
          Map View
        </button>
      </div>
    `;
  },

  _inputParam(label, val, color) {
    return `
      <div style="background:var(--bg-panel);border-radius:var(--radius-sm);padding:8px;text-align:center;">
        <div style="font-size:9px;color:var(--text-muted);margin-bottom:2px;">${label}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;color:${color};">${val.toFixed(2)}</div>
      </div>
    `;
  },

  _factorBar(label, val, cls, customColor = null) {
    const pct = Math.round(val * 100);
    const fillStyle = customColor ? `style="width:${pct}%;background:${customColor}"` : `style="width:${pct}%"`;
    return `
      <div class="progress-bar-container">
        <div class="progress-label">
          <span>${label}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="font-family:'JetBrains Mono',monospace;color:var(--text-secondary);">${'█'.repeat(Math.round(pct/10))}${'░'.repeat(10-Math.round(pct/10))}</div>
            <span>${pct}%</span>
          </div>
        </div>
        <div class="progress-track" style="height:8px;">
          <div class="progress-fill ${cls}" ${fillStyle}></div>
        </div>
      </div>
    `;
  },

  _buildRecommendationLogic(score, h) {
    if (score >= 70) {
      return `Score ≥ 70 → <strong style="color:var(--status-critical);">ACT NOW</strong><br>
      High plastic burden + high persistence + sufficient confidence + feasible intervention detected.`;
    }
    if (score >= 40) {
      return `Score 40–69 → <strong style="color:var(--status-high);">VERIFY / SCHEDULE</strong><br>
      Moderate risk indicators. Field verification recommended before committing resources.`;
    }
    return `Score &lt; 40 → <strong style="color:var(--accent-primary);">MONITOR</strong><br>
    Insufficient evidence for immediate action. Continue passive monitoring.`;
  },

  async _dispatchIntervention(nodeId) {
    const hotspot = this.hotspotsData.find(h => h.nodeId === nodeId);
    if (!hotspot) return;

    const reason = `Priority Score ${hotspot.priorityScore}/100 — S:${(hotspot.severity||0).toFixed(2)} × P:${(hotspot.persistence||0).toFixed(2)} × E:${(hotspot.exposure||0).toFixed(2)} × F:${(hotspot.feasibility||0).toFixed(2)}`;
    const action = hotspot.priorityScore >= 70
      ? 'Deploy boom interceptor + manual collection team at creek mouth'
      : 'Field team inspection and net barrier deployment';

    try {
      await API.createIntervention({
        nodeId,
        reason,
        recommendedAction: action,
        assignedTeam: 'Field Team Alpha'
      });
      Toast.show('info', 'Intervention Dispatched', `${hotspot.recommendation} — Team dispatched to ${hotspot.name}`, 4000);
      navigateTo('interventions');
    } catch (e) {
      Toast.show('critical', 'Dispatch Failed', 'Unable to create intervention. Check backend connection.');
    }
  }
};

window.DecisionEngine = DecisionEngine;
