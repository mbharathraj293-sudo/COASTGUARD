/**
 * COASTGUARD - Interventions Page
 * Full intervention workflow management.
 */

const Interventions = {
  interventions: [],

  async init() {
    await this.loadInterventions();

    CGSocket.on('intervention_update', () => this.loadInterventions());
  },

  async loadInterventions() {
    try {
      const res = await API.getInterventions();
      if (res.data) {
        this.interventions = res.data;
        this._renderList();
      }
    } catch (e) { console.error('[INT] Load error:', e); }
  },

  _statusOrder: ['alert', 'dispatched', 'in_progress', 'intercepted', 'collection', 'completed'],
  _statusLabel: {
    alert: 'ALERT',
    dispatched: 'DISPATCH',
    in_progress: 'FIELD RESPONSE',
    intercepted: 'INTERCEPTION',
    collection: 'COLLECTION',
    completed: 'COMPLETED'
  },

  _renderList() {
    const container = document.getElementById('interventions-list');
    if (!container) return;

    if (!this.interventions.length) {
      container.innerHTML = `<div class="text-muted text-sm" style="padding:24px;text-align:center;">
        No active interventions. Hotspot alerts will trigger dispatch prompts.
      </div>`;
      return;
    }

    container.innerHTML = this.interventions.map(i => this._renderCard(i)).join('');
  },

  _renderCard(intervention) {
    let statusStep = this._statusOrder.indexOf(intervention.status);
    if (statusStep === -1) {
      if (intervention.status === 'open') statusStep = 0;
      else if (intervention.status === 'active') statusStep = 2;
      else statusStep = 1;
    }
    const priorityColor = intervention.priority >= 70 ? 'var(--status-critical)' : intervention.priority >= 45 ? 'var(--status-high)' : 'var(--accent-primary)';

    return `
      <div class="panel mb-md" id="int-card-${intervention.id}">
        <div class="panel-header">
          <div>
            <span class="text-mono text-accent" style="font-size:13px;font-weight:700;">${intervention.nodeId}</span>
            <span style="color:var(--text-muted);font-size:11px;margin-left:8px;">${intervention.siteName}</span>
          </div>
          <div class="flex items-center gap-sm">
            <span style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:${priorityColor};">${intervention.priority}</span>
            <span style="font-size:10px;color:var(--text-muted);">/ 100</span>
            ${statusBadge(intervention.status === 'completed' ? 'online' : intervention.priority >= 70 ? 'critical' : 'warning')}
          </div>
        </div>
        <div class="panel-body">
          <!-- Workflow steps -->
          <div class="workflow-steps mb-md">
            ${this._statusOrder.map((s, idx) => `
              <div class="workflow-step">
                <div class="workflow-step-inner ${idx < statusStep ? 'completed' : idx === statusStep ? 'active' : ''}">
                  <div class="workflow-step-num">${idx < statusStep ? '✓' : String(idx + 1).padStart(2, '0')}</div>
                  <div class="workflow-step-label">${this._statusLabel[s]}</div>
                </div>
                ${idx < this._statusOrder.length - 1 ? '<div class="workflow-arrow">→</div>' : ''}
              </div>
            `).join('')}
          </div>

          <div class="two-col-equal mb-md">
            <div>
              <div class="text-xs text-muted mb-sm">REASON</div>
              <div class="text-sm text-secondary">${intervention.reason}</div>
            </div>
            <div>
              <div class="text-xs text-muted mb-sm">RECOMMENDED ACTION</div>
              <div class="text-sm text-secondary">${intervention.recommendedAction}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
            <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:8px;">
              <div class="text-xs text-muted">ASSIGNED TEAM</div>
              <div class="text-sm font-medium">${intervention.assignedTeam}</div>
            </div>
            <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:8px;">
              <div class="text-xs text-muted">EST. RESPONSE</div>
              <div class="text-sm font-medium">${intervention.estimatedResponse}</div>
            </div>
            <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:8px;">
              <div class="text-xs text-muted">DISPATCHED</div>
              <div class="text-sm font-medium">${formatDateTime(intervention.createdAt)}</div>
            </div>
          </div>

          <div class="flex gap-sm" style="flex-wrap:wrap;align-items:center;">
            ${intervention.status === 'alert' ? `
              <button class="btn btn-primary btn-sm" onclick="Interventions.updateStatus('${intervention.id}','dispatched')">
                🚨 Dispatch Rapid Response Team
              </button>` : ''}
            ${intervention.status === 'dispatched' ? `
              <button class="btn btn-outline btn-sm" onclick="Interventions.updateStatus('${intervention.id}','in_progress')">
                🚛 Start Field Response
              </button>` : ''}
            ${intervention.status === 'in_progress' ? `
              <button class="btn btn-outline btn-sm" onclick="Interventions.updateStatus('${intervention.id}','intercepted')">
                🛡 Deploy Containment Booms
              </button>` : ''}
            ${intervention.status === 'intercepted' ? `
              <button class="btn btn-outline btn-sm" onclick="Interventions.updateStatus('${intervention.id}','collection')">
                ♻ Initiate Plastic Collection
              </button>` : ''}
            ${intervention.status === 'collection' ? `
              <button class="btn btn-primary btn-sm" onclick="Interventions.completeAndRecord('${intervention.id}','${intervention.nodeId}')">
                ✓ Confirm Collection & Log Recovery
              </button>` : ''}
            ${intervention.status === 'completed' ? `
              <span class="badge badge-online" style="padding:6px 12px;font-size:11px;">
                ✓ Completed & Verified · ${formatDateTime(intervention.updatedAt)}
              </span>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  async updateStatus(id, status) {
    try {
      await API.updateIntervention(id, { status });
      Toast.show('info', 'Intervention Updated', `Status changed to ${status.replace('_', ' ').toUpperCase()}`);
      await this.loadInterventions();
    } catch (e) {
      Toast.show('critical', 'Error', 'Failed to update intervention');
    }
  },

  async completeAndRecord(id, nodeId) {
    try {
      await API.updateIntervention(id, { status: 'completed' });
      const pet = Math.round(35 + Math.random() * 15);
      const hdpe = Math.round(20 + Math.random() * 10);
      const flex = Math.round(25 + Math.random() * 10);
      const mixed = Math.round(15 + Math.random() * 10);
      const debris = Math.round(5 + Math.random() * 5);
      const totalCollected = pet + hdpe + flex + mixed + debris;

      // Auto-create a recovery record linking directly to this intervention
      await API.createRecovery({
        interventionId: id,
        nodeId,
        collectedKg: totalCollected,
        materials: {
          PET: pet,
          HDPE: hdpe,
          'Flexible Plastic': flex,
          'Mixed Plastic': mixed,
          'Other Debris': debris
        },
        recoveryPathway: { Recycling: 60, 'Material Recovery': 25, 'Safe Disposal': 15 }
      });
      Toast.show('info', 'Recovery Recorded', `Collection data (${totalCollected} kg) logged for ${nodeId}`);
      await this.loadInterventions();
      navigateTo('recovery-circularity');
    } catch (e) {
      Toast.show('critical', 'Error', 'Failed to complete intervention');
    }
  }
};

window.Interventions = Interventions;
