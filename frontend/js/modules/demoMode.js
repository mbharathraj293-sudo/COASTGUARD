/**
 * COASTGUARD - Master Demo Mode (Section 17)
 * Automated 75-second end-to-end competition demonstration.
 * Flow:
 * STEP 1:  NORMAL SYSTEM
 * STEP 2:  TRIGGER MONSOON
 * STEP 3:  ENVIRONMENTAL RESPONSE (Flow surge)
 * STEP 4:  PLASTIC TRANSPORT RISK
 * STEP 5:  AI VISION (Detection of PET cluster)
 * STEP 6:  TEMPORAL INTELLIGENCE (Persistence escalation)
 * STEP 7:  DECISION ENGINE (Formula recalculation)
 * STEP 8:  DECISION (ACT NOW)
 * STEP 9:  ALERT (System alert generated)
 * STEP 10: INTERVENTION (Intervention created)
 * STEP 11: DISPATCH (Team dispatched)
 * STEP 12: COLLECTION (Collection completed)
 * STEP 13: RECOVERY (Recovery ledger updated)
 * STEP 14: CLASSIFICATION (Material classified)
 * STEP 15: ROUTING (Circular recovery pathway)
 * STEP 16: VERIFICATION (Traceability verified)
 * FINAL:   LEAKAGE → INTELLIGENCE → ACTION → VALUE
 */

const DemoMode = {
  isRunning: false,
  currentStep: 0,
  stepTimers: [],
  totalSteps: 16,

  STEPS: [
    { step: 1,  delay: 0,     label: 'Normal System Baseline', detail: 'Normal rainfall, baseline flow & telemetry across 8 outfall nodes' },
    { step: 2,  delay: 4500,  label: 'Trigger Monsoon Surge', detail: 'Monsoon event active — rainfall rising to 18.4 mm/h' },
    { step: 3,  delay: 9000,  label: 'Hydrodynamic Response', detail: 'Drainage flow surging to 86.5 L/s at Mithi Creek Outfall' },
    { step: 4,  delay: 14000, label: 'Plastic Transport Risk Escalates', detail: 'Hydrodynamic flush index crosses 96% — flush into creek imminent' },
    { step: 5,  delay: 19000, label: 'AI Vision Optical Detection', detail: 'YOLO optical inference identifies PET debris cluster (94% conf)' },
    { step: 6,  delay: 24000, label: 'Temporal Intelligence Analysis', detail: '12 repeated detections in 24h — Persistence evaluated as HIGH' },
    { step: 7,  delay: 29000, label: 'Decision Engine Recalculation', detail: 'Formula S × P × E × F computes Priority Score = 87 / 100' },
    { step: 8,  delay: 34000, label: 'Priority Escalation: ACT NOW', detail: 'OUT-07 escalated to ACT NOW — Immediate interception required' },
    { step: 9,  delay: 39000, label: 'Priority Alert Generated', detail: 'System alert dispatched across municipal dashboard' },
    { step: 10, delay: 44000, label: 'Intervention Ticket Created', detail: 'Ticket INT-MITHI-2024-07 generated for rapid boom deployment' },
    { step: 11, delay: 49000, label: 'Field Team Alpha Dispatched', detail: 'Rapid response containment unit dispatched to outfall site' },
    { step: 12, delay: 54000, label: 'Interception & Collection Complete', detail: 'Creek mouth booms deployed — 127 kg plastic intercepted' },
    { step: 13, delay: 59000, label: 'Recovery Ledger Updated', detail: 'Collection quantity logged into immutable recovery ledger' },
    { step: 14, delay: 64000, label: 'Material Classification Segregation', detail: 'PET (42kg), HDPE (31kg), Flexible (28kg), Mixed (26kg)' },
    { step: 15, delay: 69000, label: 'Circular Recovery Pathway Assigned', detail: 'Routed to 60% Mechanical Recycling, 25% Material Recovery' },
    { step: 16, delay: 74000, label: 'Traceability Verification Complete', detail: 'Chain verified: Leakage → Intelligence → Action → Value' }
  ],

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentStep = 0;

    const btn = document.getElementById('btn-run-demo');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Demo Running...'; }

    this._renderTimeline();

    // Execute each step
    this.STEPS.forEach(({ step, delay, label }) => {
      const timer = setTimeout(async () => {
        if (!this.isRunning) return;
        this.currentStep = step;
        this._updateTimeline(step);

        try {
          await API.triggerDemoStep(step);
        } catch (e) { /* ignore */ }

        // Contextual navigation
        this._navigateForStep(step);

        // Toast feedback
        const stepData = this.STEPS.find(s => s.step === step);
        const type = (step >= 7 && step <= 9) ? 'critical' : (step >= 2 && step <= 6) ? 'warning' : 'info';
        Toast.show(type, `Step ${step}: ${stepData?.label}`, stepData?.detail || '', 3500);

        if (step === this.totalSteps) {
          setTimeout(() => this._finish(), 3000);
        }
      }, delay);
      this.stepTimers.push(timer);
    });
  },

  _navigateForStep(step) {
    const nav = {
      1: 'command-center',
      2: 'live-monitoring',
      3: 'live-monitoring',
      4: 'live-monitoring',
      5: 'ai-vision',
      6: 'hotspot-intelligence',
      7: 'decision-engine',
      8: 'decision-engine',
      9: 'command-center',
      10: 'interventions',
      11: 'interventions',
      12: 'interventions',
      13: 'recovery-circularity',
      14: 'recovery-circularity',
      15: 'recovery-circularity',
      16: 'recovery-circularity'
    };
    if (nav[step]) navigateTo(nav[step]);
  },

  _renderTimeline() {
    const container = document.getElementById('demo-timeline');
    if (!container) return;

    container.innerHTML = this.STEPS.map(s => `
      <div class="demo-step" id="demo-step-${s.step}">
        <div class="demo-step-num">${String(s.step).padStart(2, '0')}</div>
        <div class="demo-step-label">${s.label}</div>
        <div class="demo-step-status" id="demo-step-status-${s.step}">○</div>
      </div>
    `).join('');
  },

  _updateTimeline(step) {
    for (let i = 1; i < step; i++) {
      const el = document.getElementById(`demo-step-${i}`);
      if (el) { el.classList.remove('active'); el.classList.add('completed'); }
      const status = document.getElementById(`demo-step-status-${i}`);
      if (status) status.textContent = '✓';
    }
    const current = document.getElementById(`demo-step-${step}`);
    if (current) { current.classList.add('active'); current.classList.remove('completed'); }
    const currentStatus = document.getElementById(`demo-step-status-${step}`);
    if (currentStatus) currentStatus.textContent = '▶';

    current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  _finish() {
    this.isRunning = false;
    this.currentStep = 0;

    const btn = document.getElementById('btn-run-demo');
    if (btn) { btn.disabled = false; btn.textContent = '▶ RUN COASTGUARD DEMO'; }

    // Mark all complete
    this.STEPS.forEach(s => {
      const el = document.getElementById(`demo-step-${s.step}`);
      if (el) { el.classList.add('completed'); el.classList.remove('active'); }
      const status = document.getElementById(`demo-step-status-${s.step}`);
      if (status) status.textContent = '✓';
    });

    // Show Judge Final Screen Modal
    this._showFinalBanner();
  },

  _showFinalBanner() {
    let modal = document.getElementById('demo-completion-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'demo-completion-modal';
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999;
      `;
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:#ffffff;border-radius:12px;padding:32px;max-width:560px;width:90%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);border:1px solid #e2e8f0;text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">🌊</div>
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#0f766e;margin-bottom:4px;">COASTGUARD INTELLIGENCE LOOP COMPLETE</div>
        <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:12px;">LEAKAGE → INTELLIGENCE → ACTION → VALUE</h2>
        
        <p style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:20px;">
          The demonstration successfully traced coastal plastic leakage from upstream stormwater surge through AI vision detection, temporal persistence analysis, prioritized intervention dispatch, and traceable circular recovery.
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:20px;font-size:11px;color:#64748b;line-height:1.5;">
          <strong>Human-in-the-Loop Standard:</strong> AI recommends intervention priority and routing feasibility. Final field deployment remains human-validated.
        </div>

        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="btn btn-primary" onclick="document.getElementById('demo-completion-modal').style.display='none'; navigateTo('command-center');">
            Return to Command Center
          </button>
          <button class="btn btn-outline" onclick="document.getElementById('demo-completion-modal').style.display='none'; navigateTo('recovery-circularity');">
            Inspect Recovery Ledger
          </button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  },

  stop() {
    this.stepTimers.forEach(t => clearTimeout(t));
    this.stepTimers = [];
    this.isRunning = false;
    this.currentStep = 0;

    const btn = document.getElementById('btn-run-demo');
    if (btn) { btn.disabled = false; btn.textContent = '▶ RUN COASTGUARD DEMO'; }

    API.setSimMode('normal').catch(() => {});
  }
};

window.DemoMode = DemoMode;
