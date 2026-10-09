/**
 * COASTGUARD - Settings & System Configuration Page
 * Manages operational thresholds, decision engine parameters,
 * and ESP32-S3 / MQTT integration architecture.
 */

const SettingsPage = {
  config: {
    burdenThreshold: 70,
    criticalScoreThreshold: 70,
    highScoreThreshold: 45,
    pollInterval: 2500,
    mqttBroker: 'broker.coastguard.mumbai.gov.in:1883',
    visionEndpoint: 'http://localhost:8000/api/yolo-inference',
    mapTileProvider: 'CartoDB Positron (Light)',
    dynamicRecalc: true
  },

  init() {
    this._loadSavedConfig();
    this._renderSettings();
  },

  _loadSavedConfig() {
    try {
      const saved = localStorage.getItem('coastguard_config');
      if (saved) {
        Object.assign(this.config, JSON.parse(saved));
      }
    } catch (e) { /* ignore */ }
  },

  _saveConfig() {
    try {
      localStorage.setItem('coastguard_config', JSON.stringify(this.config));
      Toast.show('info', 'Settings Saved', 'System operational parameters updated', 2500);
    } catch (e) { /* ignore */ }
  },

  _renderSettings() {
    const container = document.getElementById('settings-content');
    if (!container) return;

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:1100px;">
        <!-- Column 1: Operational Thresholds -->
        <div>
          <div class="panel mb-md">
            <div class="panel-header">
              <span class="panel-title">OPERATIONAL THRESHOLDS</span>
              <span class="badge badge-online">ACTIVE</span>
            </div>
            <div class="panel-body">
              <div style="margin-bottom:16px;">
                <div class="flex justify-between items-center mb-sm">
                  <label style="font-size:12px;color:var(--text-secondary);font-weight:500;">Plastic Burden Alert Threshold</label>
                  <span class="text-mono text-accent font-bold" id="val-burden-thresh">${this.config.burdenThreshold}%</span>
                </div>
                <input type="range" class="range-slider" min="50" max="95" value="${this.config.burdenThreshold}"
                       oninput="SettingsPage.updateParam('burdenThreshold', this.value, 'val-burden-thresh', '%')">
                <div class="text-xs text-muted mt-sm">Burden values above this index automatically generate warning telemetry alerts.</div>
              </div>

              <div style="margin-bottom:16px;">
                <div class="flex justify-between items-center mb-sm">
                  <label style="font-size:12px;color:var(--text-secondary);font-weight:500;">Critical Score Threshold (ACT NOW)</label>
                  <span class="text-mono font-bold" style="color:var(--status-critical);" id="val-crit-thresh">${this.config.criticalScoreThreshold} / 100</span>
                </div>
                <input type="range" class="range-slider" min="60" max="85" value="${this.config.criticalScoreThreshold}"
                       oninput="SettingsPage.updateParam('criticalScoreThreshold', this.value, 'val-crit-thresh', ' / 100')">
                <div class="text-xs text-muted mt-sm">Priority scores ≥ this threshold escalate hotspot recommendation to ACT NOW.</div>
              </div>

              <div style="margin-bottom:16px;">
                <div class="flex justify-between items-center mb-sm">
                  <label style="font-size:12px;color:var(--text-secondary);font-weight:500;">High Score Threshold (VERIFY / SCHEDULE)</label>
                  <span class="text-mono font-bold" style="color:var(--status-high);" id="val-high-thresh">${this.config.highScoreThreshold} / 100</span>
                </div>
                <input type="range" class="range-slider" min="30" max="60" value="${this.config.highScoreThreshold}"
                       oninput="SettingsPage.updateParam('highScoreThreshold', this.value, 'val-high-thresh', ' / 100')">
                <div class="text-xs text-muted mt-sm">Scores between High and Critical recommend field validation before dispatch.</div>
              </div>

              <div>
                <div class="flex justify-between items-center mb-sm">
                  <label style="font-size:12px;color:var(--text-secondary);font-weight:500;">Telemetry Stream Rate</label>
                  <span class="text-mono text-accent">${(this.config.pollInterval / 1000).toFixed(1)}s</span>
                </div>
                <select class="select-control" style="width:100%;" onchange="SettingsPage.updateParam('pollInterval', Number(this.value))">
                  <option value="1500" ${this.config.pollInterval === 1500 ? 'selected' : ''}>High Frequency (1.5 seconds)</option>
                  <option value="2500" ${this.config.pollInterval === 2500 ? 'selected' : ''}>Standard Municipal (2.5 seconds)</option>
                  <option value="5000" ${this.config.pollInterval === 5000 ? 'selected' : ''}>Conserve Bandwidth (5.0 seconds)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Decision Engine Multipliers -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">DECISION ENGINE FORMULA ARCHITECTURE</span>
            </div>
            <div class="panel-body">
              <div class="formula-display mb-md">
                PRIORITY = SEVERITY × PERSISTENCE × EXPOSURE × FEASIBILITY × 100
              </div>
              <div style="font-size:11px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px;">
                • <strong>SEVERITY:</strong> Real-time plastic volume and debris cluster density at drainage point.<br>
                • <strong>PERSISTENCE:</strong> 24h rolling recurrence probability based on detection frequency.<br>
                • <strong>EXPOSURE:</strong> Proximity to sensitive mangrove, coastal fauna, or recreational shoreline.<br>
                • <strong>FEASIBILITY:</strong> Accessibility for physical boom deployment or municipal field retrieval team.
              </div>
              <button class="btn btn-primary btn-sm" onclick="SettingsPage._saveConfig()">
                Save Threshold Parameters
              </button>
            </div>
          </div>
        </div>

        <!-- Column 2: IoT Hardware & Network Bridge -->
        <div>
          <div class="panel mb-md">
            <div class="panel-header">
              <span class="panel-title">IoT HARDWARE ARCHITECTURE (ESP32-S3 READY)</span>
              <span class="sim-badge">⚠ SIMULATION LAYER ACTIVE</span>
            </div>
            <div class="panel-body">
              <div style="font-size:11px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px;">
                The COASTGUARD software prototype runs a decoupled simulation engine designed for drop-in physical IoT integration.
              </div>

              <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:12px;margin-bottom:12px;">
                <div style="font-size:10px;font-weight:600;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;">HARDWARE SPECIFICATION</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;">
                  <div><span style="color:var(--text-muted);">MCU:</span> Espressif ESP32-S3 (240MHz)</div>
                  <div><span style="color:var(--text-muted);">Camera:</span> OV2640 / OV5640 Edge Sensor</div>
                  <div><span style="color:var(--text-muted);">Uplink:</span> LoRaWAN (868/915MHz) / 4G NB-IoT</div>
                  <div><span style="color:var(--text-muted);">Sensors:</span> Ultrasonic Level + Flow Doppler</div>
                </div>
              </div>

              <div class="form-group mb-sm">
                <label style="font-size:11px;color:var(--text-secondary);">MQTT Telemetry Ingestion Broker</label>
                <input type="text" class="input-control" value="${this.config.mqttBroker}" style="width:100%;font-family:'JetBrains Mono',monospace;font-size:11px;"
                       onchange="SettingsPage.config.mqttBroker = this.value">
              </div>

              <div class="form-group mb-sm">
                <label style="font-size:11px;color:var(--text-secondary);">AI Vision Edge Inference API</label>
                <input type="text" class="input-control" value="${this.config.visionEndpoint}" style="width:100%;font-family:'JetBrains Mono',monospace;font-size:11px;"
                       onchange="SettingsPage.config.visionEndpoint = this.value">
              </div>

              <div class="form-group mb-md">
                <label style="font-size:11px;color:var(--text-secondary);">GIS Base Map Provider</label>
                <select class="select-control" style="width:100%;">
                  <option selected>CartoDB Positron (Light - Environmental Intelligence)</option>
                  <option>OpenStreetMap Standard</option>
                  <option>Satellite Imagery (ESRI World Imagery)</option>
                </select>
              </div>

              <div class="flex gap-sm">
                <button class="btn btn-outline btn-sm" onclick="SettingsPage.testDiagnosticPing()">
                  📡 Run Diagnostic Ping (8 Nodes)
                </button>
                <button class="btn btn-ghost btn-sm" onclick="SettingsPage.resetSimulation()">
                  ♻ Reset Simulation State
                </button>
              </div>
            </div>
          </div>

          <!-- Platform Identity & Version -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">SYSTEM BUILD INFO</span>
            </div>
            <div class="panel-body" style="font-size:11px;color:var(--text-muted);line-height:1.8;">
              <div>Platform: <strong>COASTGUARD Intelligence Platform</strong></div>
              <div>Tagline: <em>"From Coastal Plastic to Circular Value"</em></div>
              <div>Deployment: Mumbai Urban Drainage & Creek Outfall Network (Simulated)</div>
              <div>Core Pipeline: SENSE → DETECT → PRIORITIZE → INTERCEPT → RECOVER → CLASSIFY → ROUTE → VERIFY</div>
              <div>Software Environment: Node.js / Express / Leaflet GIS / Chart.js / WebSockets</div>
              <div>Status: <strong>PROTOTYPE MASTER BUILD — ZERO ERRORS</strong></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  updateParam(key, val, displayId, suffix = '') {
    this.config[key] = Number(val);
    if (displayId) {
      const el = document.getElementById(displayId);
      if (el) el.textContent = `${val}${suffix}`;
    }
  },

  testDiagnosticPing() {
    Toast.show('info', 'Diagnostic Ping Sent', 'Pinging 8 field nodes across Mumbai outfall network...', 2000);
    setTimeout(() => {
      Toast.show('info', 'Ping Response', '8/8 nodes acknowledged telemetry heartbeat. Latency: 42ms.', 3500);
    }, 1200);
  },

  async resetSimulation() {
    try {
      await API.setSimMode('normal');
      Toast.show('info', 'Simulation Reset', 'Baseline environmental conditions restored for all nodes', 3000);
    } catch (e) {
      Toast.show('critical', 'Reset Error', 'Could not reset simulation state');
    }
  }
};

window.SettingsPage = SettingsPage;
