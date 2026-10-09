/**
 * COASTGUARD - AI Vision Module
 * Simulated YOLO-based plastic detection interface.
 * Interface is designed so a real model can be plugged in via API.
 */

const AIVision = {
  detectionCanvas: null,
  detectionCtx: null,
  currentImageSrc: null,
  isProcessing: false,

  DETECTION_CLASSES: [
    { class: 'PET (Polyethylene Terephthalate)', emoji: '🍶', weight: 0.35, shortClass: 'PET' },
    { class: 'HDPE (High-Density Polyethylene)', emoji: '🧴', weight: 0.25, shortClass: 'HDPE' },
    { class: 'LDPE / FLEXIBLE (Film & Bags)', emoji: '🛍️', weight: 0.20, shortClass: 'LDPE / FLEXIBLE' },
    { class: 'MIXED PLASTIC (Composite / Multilayer)', emoji: '📦', weight: 0.12, shortClass: 'MIXED PLASTIC' },
    { class: 'OTHER DEBRIS (Organic / Macro-waste)', emoji: '🌊', weight: 0.08, shortClass: 'OTHER DEBRIS' }
  ],

  init() {
    this.detectionCanvas = document.getElementById('vision-canvas');
    if (this.detectionCanvas) {
      this.detectionCtx = this.detectionCanvas.getContext('2d');
      this._drawPlaceholder();
    }

    // Setup drag/drop
    const dropzone = document.getElementById('vision-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) this._loadImage(file);
      });
      dropzone.addEventListener('click', () => document.getElementById('vision-file-input')?.click());
    }

    const fileInput = document.getElementById('vision-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) this._loadImage(e.target.files[0]);
      });
    }
  },

  _drawPlaceholder() {
    const canvas = this.detectionCanvas;
    const ctx = this.detectionCtx;
    canvas.width = canvas.offsetWidth || 600;
    canvas.height = canvas.offsetHeight || 340;

    ctx.fillStyle = '#040d12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(0,200,150,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0,200,150,0.3)';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Upload or capture an image to run AI detection', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillStyle = 'rgba(0,200,150,0.15)';
    ctx.font = '11px Inter';
    ctx.fillText('[SIMULATED YOLO DETECTION — DEMO MODE]', canvas.width / 2, canvas.height / 2 + 14);
    ctx.textAlign = 'left';
  },

  _loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentImageSrc = e.target.result;
      this._displayImage(e.target.result);
    };
    reader.readAsDataURL(file);
  },

  _displayImage(src) {
    const canvas = this.detectionCanvas;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = canvas.offsetWidth || 600;
      canvas.height = canvas.offsetHeight || 340;
      const ctx = this.detectionCtx;

      // Draw image scaled to canvas
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#040d12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      this._storeImageBounds({ x, y, w: img.width * scale, h: img.height * scale });
    };
    img.src = src;
  },

  _storeImageBounds(bounds) {
    this._imgBounds = bounds;
  },

  async runDetection() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const btn = document.getElementById('btn-run-detection');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }

    // Show processing state
    const resultsEl = document.getElementById('detection-results');
    if (resultsEl) {
      resultsEl.innerHTML = `
        <div style="text-align:center;padding:24px;">
          <div class="loading-spinner" style="width:24px;height:24px;margin:0 auto 12px;"></div>
          <div style="font-size:12px;color:var(--text-muted);">Running YOLO inference...</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">[SIMULATED]</div>
        </div>`;
    }

    // Simulate inference delay
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));

    // If no custom image loaded, generate simulated camera frame
    if (!this._imgBounds) {
      const canvas = this.detectionCanvas;
      const ctx = this.detectionCtx;
      if (canvas && ctx) {
        canvas.width = canvas.offsetWidth || 600;
        canvas.height = canvas.offsetHeight || 340;
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#040d12');
        grad.addColorStop(0.5, '#062038');
        grad.addColorStop(1, '#040d12');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(0, 200, 150, 0.12)';
        ctx.lineWidth = 1;
        for (let y = 30; y < canvas.height - 20; y += 24) {
          ctx.beginPath();
          for (let x = 0; x < canvas.width; x += 10) {
            const dy = Math.sin(x * 0.02 + y) * 4;
            x === 0 ? ctx.moveTo(x, y + dy) : ctx.lineTo(x, y + dy);
          }
          ctx.stroke();
        }

        ctx.font = '10px JetBrains Mono';
        ctx.fillStyle = 'rgba(0, 200, 150, 0.7)';
        ctx.fillText('CAM-OUT-07 // MITHI RIVER CREEK OUTFALL [SAMPLE FRAME]', 14, 22);
        ctx.fillText('SIMULATED YOLOv8-NANO INFERENCE // THRESHOLD 0.75', 14, canvas.height - 14);

        this._imgBounds = { x: 30, y: 30, w: canvas.width - 60, h: canvas.height - 60 };
      }
    }

    // Generate simulated detections
    const detections = this._simulateDetection();

    // Draw bounding boxes
    if (this._imgBounds) {
      this._drawDetections(detections);
    }

    // Render results
    this._renderResults(detections);

    if (btn) { btn.disabled = false; btn.textContent = '▶ Run Detection'; }
    this.isProcessing = false;
  },

  _simulateDetection() {
    // Weighted random selection of detected objects
    const numObjects = Math.floor(3 + Math.random() * 6);
    const detections = [];

    for (let i = 0; i < Math.min(numObjects, 5); i++) {
      const cls = this._weightedRandom(this.DETECTION_CLASSES);
      const confidence = 0.75 + Math.random() * 0.23;
      const bounds = this._imgBounds || { x: 50, y: 50, w: 400, h: 300 };

      detections.push({
        class: cls.class,
        emoji: cls.emoji,
        confidence: Math.round(confidence * 100) / 100,
        count: Math.floor(1 + Math.random() * 4),
        bbox: {
          x: bounds.x + Math.random() * bounds.w * 0.6,
          y: bounds.y + Math.random() * bounds.h * 0.6,
          w: bounds.w * (0.1 + Math.random() * 0.25),
          h: bounds.h * (0.1 + Math.random() * 0.2)
        }
      });
    }

    return detections;
  },

  _weightedRandom(items) {
    const total = items.reduce((sum, i) => sum + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return items[0];
  },

  _drawDetections(detections) {
    const canvas = this.detectionCanvas;
    const ctx = this.detectionCtx;
    if (!canvas || !ctx) return;

    const colors = ['#e53e3e', '#f6ad55', '#f6e05e', '#63b3ed', '#00c896'];

    detections.forEach((det, i) => {
      const color = colors[i % colors.length];
      const { x, y, w, h } = det.bbox;

      // Dashed box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // Corners
      const cSize = 6;
      ctx.fillStyle = color;
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) => {
        ctx.fillRect(cx - cSize/2, cy - cSize/2, cSize, cSize);
      });

      // Label bg
      const label = `${det.class} ${Math.round(det.confidence * 100)}%`;
      ctx.font = 'bold 10px JetBrains Mono';
      const lw = ctx.measureText(label).width + 8;
      ctx.fillStyle = 'rgba(4,13,18,0.85)';
      ctx.fillRect(x, y - 18, lw, 16);
      ctx.fillStyle = color;
      ctx.fillText(label, x + 4, y - 6);
    });
  },

  useDemoImage() {
    const canvas = this.detectionCanvas;
    const ctx = this.detectionCtx;
    if (!canvas || !ctx) return;
    canvas.width = canvas.offsetWidth || 600;
    canvas.height = canvas.offsetHeight || 320;

    // Draw realistic camera water background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#040d12');
    grad.addColorStop(0.5, '#07243c');
    grad.addColorStop(1, '#040d12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Water ripple lines
    ctx.strokeStyle = 'rgba(0, 200, 150, 0.16)';
    ctx.lineWidth = 1.5;
    for (let y = 20; y < canvas.height - 20; y += 22) {
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 10) {
        const dy = Math.sin(x * 0.03 + y) * 5;
        x === 0 ? ctx.moveTo(x, y + dy) : ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    }

    // Floating debris items
    ctx.fillStyle = 'rgba(240, 248, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.35, canvas.height * 0.45, 26, 12, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(254, 240, 138, 0.7)';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.65, canvas.height * 0.55, 32, 18, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Timestamp & HUD overlay
    const now = new Date();
    const ts = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = 'rgba(0, 200, 150, 0.9)';
    ctx.fillText(`CAM-OUT-03 // MITHI RIVER CREEK OUTFALL [OPTICAL EVIDENCE] ${ts}`, 14, 22);
    ctx.fillText('SIMULATED OPTICAL SENSOR // RESOLUTION: 1920x1080 // THRESHOLD: 0.75', 14, canvas.height - 14);

    this._imgBounds = { x: 20, y: 20, w: canvas.width - 40, h: canvas.height - 40 };
    Toast.show('info', 'Demo Frame Loaded', 'Click "Run Detection" to analyze evidence frame', 2000);
  },

  _renderResults(detections) {
    const container = document.getElementById('detection-results');
    if (!container) return;

    const totalObjects = detections.reduce((sum, d) => sum + d.count, 0);
    const avgConf = detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;
    const burdenLevel = totalObjects >= 8 ? 'HIGH' : totalObjects >= 4 ? 'MEDIUM' : 'LOW';
    const burdenColor = burdenLevel === 'HIGH' ? 'var(--status-critical)' : burdenLevel === 'MEDIUM' ? 'var(--status-high)' : 'var(--accent-primary)';

    container.innerHTML = `
      <!-- Structured Detection Result Card -->
      <div class="panel" style="margin-bottom:12px;border-left:4px solid var(--accent-primary);">
        <div class="panel-header" style="padding:10px 14px;">
          <span class="panel-title" style="font-size:11px;">DETECTION RESULT</span>
          <span class="badge badge-warning">SIMULATED AI INFERENCE</span>
        </div>
        <div class="panel-body" style="padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div>
              <div style="font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:0.8px;">PRIMARY EVIDENCE</div>
              <div style="font-size:15px;font-weight:800;color:var(--text-primary);">Plastic / Surface Debris</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:0.8px;">CONFIDENCE</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:800;color:var(--accent-primary);">${Math.round(avgConf * 100)}%</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;font-size:11px;">
            <div style="background:#f8fafc;padding:8px;border-radius:4px;border:1px solid #e2e8f0;">
              <span style="color:var(--text-muted);font-size:9px;font-weight:700;">MATERIAL:</span><br>
              <strong style="color:var(--text-primary);">PET / Mixed Polymers</strong>
            </div>
            <div style="background:#f8fafc;padding:8px;border-radius:4px;border:1px solid #e2e8f0;">
              <span style="color:var(--text-muted);font-size:9px;font-weight:700;">EVIDENCE QUALITY:</span><br>
              <strong style="color:var(--accent-primary);">${avgConf > 0.85 ? 'HIGH' : 'MEDIUM'}</strong>
            </div>
            <div style="background:#f8fafc;padding:8px;border-radius:4px;border:1px solid #e2e8f0;">
              <span style="color:var(--text-muted);font-size:9px;font-weight:700;">LOCATION:</span><br>
              <strong style="color:var(--text-primary);">OUT-03 (Mithi River)</strong>
            </div>
            <div style="background:#f8fafc;padding:8px;border-radius:4px;border:1px solid #e2e8f0;">
              <span style="color:var(--text-muted);font-size:9px;font-weight:700;">STATUS:</span><br>
              <strong style="color:var(--status-high);font-size:10px;">AI DETECTED — HUMAN VERIFICATION PENDING</strong>
            </div>
          </div>
          <div style="font-size:10px;color:var(--text-muted);border-top:1px solid #f1f5f9;padding-top:6px;line-height:1.4;">
            Evidence directly feeds into the Decision Engine for recurrence & priority recalculation.
          </div>
        </div>
      </div>

      <!-- Itemized Breakdown -->
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text-muted);margin:14px 0 8px;text-transform:uppercase;">
        CLASSIFIED DETECTIONS (${totalObjects} OBJECTS)
      </div>
      ${detections.map(d => `
        <div class="detection-result">
          <span style="font-size:20px;">${d.emoji}</span>
          <div style="flex:1;">
            <div class="detection-class">${d.class}</div>
            <div style="font-size:10px;color:var(--text-muted);">Count: ${d.count}</div>
          </div>
          <div class="confidence-bar-inline">
            <div class="confidence-fill" style="width:${Math.round(d.confidence*100)}%"></div>
          </div>
          <div class="confidence-value">${Math.round(d.confidence*100)}%</div>
        </div>
      `).join('')}
      <div style="margin-top:12px;padding:8px 12px;background:#fefce8;border:1px solid #fef08a;border-radius:var(--radius-sm);font-size:10px;color:#854d0e;">
        ⚠ SIMULATED AI INFERENCE — Prototype demonstration only. In production, field cameras connect to edge YOLOv8-nano inference runtime.
      </div>
    `;
  },

  clearDetection() {
    this.currentImageSrc = null;
    this._imgBounds = null;
    this._drawPlaceholder();
    const results = document.getElementById('detection-results');
    if (results) results.innerHTML = '<div class="text-muted text-sm" style="padding:16px;text-align:center;">Upload an image or click "Load Demo Frame" to run detection</div>';
  },

  reset() {
    this.clearDetection();
    Toast.show('info', 'Workspace Reset', 'AI Vision inference frame cleared', 2000);
  }
};

window.AIVision = AIVision;
