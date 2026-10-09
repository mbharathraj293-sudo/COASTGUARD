/**
 * COASTGUARD - Live Monitoring Page
 * Simulated camera feed + real-time node telemetry.
 */

const LiveMonitoring = {
  canvas: null,
  ctx: null,
  animFrame: null,
  selectedNodeId: 'OUT-07',
  nodesData: {},
  _animT: 0,
  _detections: [],
  _simDetectionActive: false,

  async init() {
    this.canvas = document.getElementById('cam-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this._startCameraSimulation();
    }

    // Load node list for selector
    try {
      const res = await API.getNodes();
      if (res.data) {
        res.data.forEach(n => { this.nodesData[n.id] = n; });
        this._populateNodeSelector(res.data);
        this._renderNodePanel(res.data.find(n => n.id === this.selectedNodeId) || res.data[0]);
      }
    } catch (e) { console.error('[LiveMon] Init error:', e); }

    this._renderEventLog([]);

    // Subscribe to real-time
    CGSocket.on('sensor_update', (data) => this._onSensorUpdate(data));
    CGSocket.on('event_log', (data) => this._onEventLog(data));
  },

  _populateNodeSelector(nodes) {
    const sel = document.getElementById('node-selector');
    if (!sel) return;
    sel.innerHTML = nodes.map(n =>
      `<option value="${n.id}" ${n.id === this.selectedNodeId ? 'selected' : ''}>${n.id} — ${n.name}</option>`
    ).join('');
    sel.onchange = () => {
      this.selectedNodeId = sel.value;
      if (typeof AppState !== 'undefined') AppState.update('selectedNodeId', sel.value);
      this._renderNodePanel(this.nodesData[this.selectedNodeId]);
    };
  },

  _renderNodePanel(node) {
    if (!node) return;
    const s = node.sensors || {};

    const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    setEl('mon-node-id', node.id);
    setEl('mon-node-name', node.name);
    setEl('mon-node-location', node.location);

    setEl('mon-water', typeof s.waterLevel === 'number' ? `${s.waterLevel.toFixed(1)}%` : '--');
    setEl('mon-flow', typeof s.flow === 'number' ? `${s.flow.toFixed(1)} L/s` : '--');
    setEl('mon-rain', typeof s.rainfall === 'number' ? `${s.rainfall.toFixed(1)} mm/h` : '--');
    setEl('mon-temp', typeof s.temp === 'number' ? `${s.temp.toFixed(1)}°C` : '--');

    // AI evidence
    const burden = s.plasticBurden || 0;
    setEl('mon-burden', burden >= 0.75 ? 'HIGH' : burden >= 0.5 ? 'MEDIUM' : 'LOW');
    setEl('mon-confidence', `${Math.round(85 + burden * 10)}%`);

    const burdenEl = document.getElementById('mon-burden');
    if (burdenEl) {
      burdenEl.className = burden >= 0.75 ? 'text-critical font-bold' : burden >= 0.5 ? 'text-warning font-bold' : 'text-accent font-bold';
    }

    // Update cam label
    const camLabel = document.getElementById('cam-node-id');
    if (camLabel) camLabel.textContent = `CAM-${node.id}`;

    // Battery / signal
    const battEl = document.getElementById('mon-battery');
    if (battEl) {
      battEl.textContent = `${Math.round(s.battery || 0)}%`;
      battEl.className = (s.battery || 0) < 30 ? 'text-critical font-bold text-mono' : 'text-accent font-bold text-mono';
    }

    // Update progress bars
    this._updateProgressBar('bar-water', s.waterLevel || 0, 100);
    this._updateProgressBar('bar-flow', Math.min(s.flow || 0, 200), 200);
    this._updateProgressBar('bar-rain', Math.min(s.rainfall || 0, 120), 120, 'warning');
    this._updateProgressBar('bar-burden', (s.plasticBurden || 0) * 100, 100, 'critical');
  },

  _updateProgressBar(id, value, max, cls = '') {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = Math.round((value / max) * 100);
    el.style.width = `${pct}%`;
    if (cls) el.className = `progress-fill ${cls}`;
  },

  _startCameraSimulation() {
    if (!this.canvas || !this.ctx) return;

    const animate = () => {
      this.animFrame = requestAnimationFrame(animate);
      this._drawCameraFeed();
    };
    animate();
  },

  _drawCameraFeed() {
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!canvas || !ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (!W || !H || W <= 0 || H <= 0) return;
    canvas.width = W;
    canvas.height = H;
    const t = (this._animT += 0.02);

    // Background - dark water simulation
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#040d12');
    grad.addColorStop(0.5, '#062038');
    grad.addColorStop(1, '#040d12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Simulated water ripples
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const y = H * 0.3 + H * 0.4 * ((i / 6 + t * 0.05) % 1);
      const alpha = 0.04 + 0.03 * Math.sin(t + i);
      ctx.strokeStyle = `rgba(0, 200, 150, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const yWave = y + Math.sin(x * 0.02 + t + i) * 8 + Math.cos(x * 0.01 + t * 0.7) * 5;
        x === 0 ? ctx.moveTo(x, yWave) : ctx.lineTo(x, yWave);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Debris / detection boxes when active
    if (this.nodesData[this.selectedNodeId]?.sensors?.plasticBurden > 0.6) {
      this._drawDetectionBoxes(ctx, W, H, t);
    }

    // Scan line effect
    const scanY = ((t * 40) % H);
    const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
    scanGrad.addColorStop(0, 'rgba(0,200,150,0)');
    scanGrad.addColorStop(0.5, 'rgba(0,200,150,0.06)');
    scanGrad.addColorStop(1, 'rgba(0,200,150,0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 20, W, 40);

    // Noise overlay
    if (Math.random() < 0.3) {
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.015})`;
        ctx.fillRect(Math.random() * W, Math.random() * H, Math.random() * 3 + 1, 1);
      }
    }

    // Timestamp
    const now = new Date();
    const ts = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = 'rgba(0,200,150,0.7)';
    ctx.fillText(`${dateStr} ${ts}`, 12, H - 16);
    const selNode = this.nodesData[this.selectedNodeId];
    const latStr = selNode?.lat ? selNode.lat.toFixed(4) : '19.0385';
    const lngStr = selNode?.lng ? selNode.lng.toFixed(4) : '72.8498';
    ctx.fillText(`LAT ${latStr}  LNG ${lngStr}`, 12, H - 30);

    // Recording indicator (REC blink)
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = '#e53e3e';
      ctx.beginPath();
      ctx.arc(W - 20, 18, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(229,62,62,0.7)';
      ctx.font = '10px Inter';
      ctx.fillText('● REC', W - 55, 22);
    }
  },

  _drawDetectionBoxes(ctx, W, H, t) {
    const boxes = [
      { x: 0.2, y: 0.35, w: 0.15, h: 0.12, label: 'Plastic Bottle', conf: 94, color: '#e53e3e' },
      { x: 0.55, y: 0.45, w: 0.18, h: 0.10, label: 'Plastic Bag', conf: 89, color: '#f6ad55' },
      { x: 0.38, y: 0.55, w: 0.20, h: 0.14, label: 'Mixed Debris', conf: 82, color: '#f6ad55' }
    ];

    boxes.forEach((box, i) => {
      const bx = box.x * W + Math.sin(t * 0.3 + i) * 3;
      const by = box.y * H + Math.cos(t * 0.25 + i) * 2;
      const bw = box.w * W;
      const bh = box.h * H;

      // Box
      ctx.strokeStyle = box.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);

      // Corner dots
      const corners = [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]];
      corners.forEach(([cx, cy]) => {
        ctx.fillStyle = box.color;
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
      });

      // Label
      ctx.fillStyle = 'rgba(4,13,18,0.8)';
      ctx.fillRect(bx, by - 16, ctx.measureText(`${box.label} ${box.conf}%`).width + 8, 14);
      ctx.fillStyle = box.color;
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.fillText(`${box.label} ${box.conf}%`, bx + 4, by - 5);
    });
  },

  _renderEventLog(events) {
    const container = document.getElementById('mon-event-log');
    if (!container) return;
    const all = [...events, ...AppState.eventLog.filter(e => e.nodeId === this.selectedNodeId || e.nodeId === 'SYSTEM')];
    if (!all.length) {
      container.innerHTML = '<div class="text-muted text-sm" style="padding:8px;">Awaiting events...</div>';
      return;
    }
    container.innerHTML = all.slice(0, 8).map(e => `
      <div class="event-entry">
        <span class="event-time">${formatTime(e.timestamp)}</span>
        <span class="event-node ${e.type}">${e.nodeId}</span>
        <span class="event-msg">${e.message}</span>
      </div>
    `).join('');
  },

  _onSensorUpdate(data) {
    if (!data?.nodes) return;
    data.nodes.forEach(n => { if (this.nodesData[n.id]) Object.assign(this.nodesData[n.id], n); });
    const node = this.nodesData[this.selectedNodeId];
    if (node) this._renderNodePanel(node);
  },

  _onEventLog(data) {
    if (data?.event) {
      this._renderEventLog([]);
    }
  },

  destroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }
};

window.LiveMonitoring = LiveMonitoring;
