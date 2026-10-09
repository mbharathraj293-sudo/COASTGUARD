/**
 * COASTGUARD - Main Application Controller
 * Handles navigation, login, simulation controls, and page lifecycle.
 */

const App = {
  currentPage: null,
  pageInstances: {},
  simActive: false,

  // Pages that should always reload their data when navigated to
  // (they display live/changing data — interventions, recovery, analytics)
  _refreshablePages: ['interventions', 'recovery-circularity', 'analytics'],

  init() {
    Toast.init();
    this._initClock();
    this._initLogin();
    this._initNavigation();
    this._initTopbar();
    this._initNotifPanel();
    this._initWsHandlers();
    this._initSimModeSelector();
  },

  // ─── CLOCK ──────────────────────────────────────────────────
  _initClock() {
    const clockEl = document.getElementById('topbar-clock');
    if (!clockEl) return;
    const tick = () => {
      clockEl.textContent = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    };
    tick();
    setInterval(tick, 1000);
  },

  // ─── LOGIN ───────────────────────────────────────────────────
  _initLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = document.getElementById('login-username')?.value;
      const pass = document.getElementById('login-password')?.value;

      // Demo credentials
      if ((user === 'admin' && pass === 'coastguard') || (user === 'demo' && pass === 'demo')) {
        this._doLogin(user);
      } else {
        const err = document.getElementById('login-error');
        if (err) { err.textContent = 'Invalid credentials. Use: admin / coastguard'; err.style.display = 'block'; }
      }
    });

    // Auto-fill demo credentials on hint click
    const hint = document.getElementById('login-demo-hint');
    if (hint) {
      hint.addEventListener('click', () => {
        document.getElementById('login-username').value = 'admin';
        document.getElementById('login-password').value = 'coastguard';
      });
    }
  },

  _doLogin(username) {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.add('hidden');

    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = username.toUpperCase();
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.textContent = username.charAt(0).toUpperCase();

    // Navigate to command center
    this.navigateTo('command-center');
    Toast.show('info', 'Welcome to COASTGUARD', 'Coastal Plastic Intelligence Platform — OPERATIONAL', 3000);
  },

  // ─── NAVIGATION ──────────────────────────────────────────────
  _initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page) this.navigateTo(page);
      });
    });
  },

  navigateTo(pageId) {
    if (this.currentPage === pageId) {
      // Still on same page — refresh data if it's a refreshable page
      if (this._refreshablePages.includes(pageId)) {
        this._refreshPage(pageId);
      }
      return;
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageId);
    });

    // Show target page
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // Update topbar title & description
    const navItem = document.querySelector(`[data-page="${pageId}"] .nav-label`);
    const titleEl = document.getElementById('topbar-page-title');
    if (titleEl && navItem) titleEl.textContent = navItem.textContent.toUpperCase();

    const pageDescriptions = {
      'command-center': 'Real-time coastal leakage intelligence and response overview',
      'live-monitoring': 'Simulated optical evidence & high-frequency node telemetry',
      'hotspot-intelligence': 'Identify where leakage repeatedly occurs and where intervention should be prioritized',
      'ai-vision': 'Computer vision evidence for plastic leakage detection',
      'decision-engine': 'From environmental evidence to intervention priority',
      'interventions': 'Operational intervention dispatch & containment workflow',
      'recovery-circularity': 'Material classification, segregation & circular pathway traceability',
      'analytics': 'Longitudinal trends, spatial recurrence & operational metrics',
      'field-nodes': 'Hardware-ready telemetry endpoints & outfall sensor grid',
      'settings': 'Operational parameters, thresholds & simulation configuration',
      'demo-mode': 'End-to-end 78s autonomous intelligence demonstration'
    };
    const descEl = document.getElementById('topbar-page-desc');
    if (descEl) descEl.textContent = pageDescriptions[pageId] || 'Coastal environmental intelligence';

    this.currentPage = pageId;
    AppState.update('currentPage', pageId);

    // Initialize page — refreshable pages always reload data on re-visit
    if (this._refreshablePages.includes(pageId) && this.pageInstances[pageId]) {
      this._refreshPage(pageId);
    } else {
      this._initPage(pageId);
    }

    // Invalidate maps (they need resize event)
    setTimeout(() => {
      MapModule.invalidateSize('cc-map');
      MapModule.invalidateSize('hotspot-map');
    }, 100);
  },

  _refreshPage(pageId) {
    // Refresh data without re-initializing (avoids duplicate WS listeners)
    switch (pageId) {
      case 'interventions':
        if (window.Interventions) Interventions.loadInterventions();
        break;
      case 'recovery-circularity':
        if (window.RecoveryCircularity) RecoveryCircularity.loadRecords();
        break;
      case 'analytics':
        if (window.Analytics) Analytics.init();
        break;
    }
  },

  _initPage(pageId) {
    if (this.pageInstances[pageId]) return; // Already initialized
    this.pageInstances[pageId] = true;

    switch (pageId) {
      case 'command-center': CommandCenter.init(); break;
      case 'live-monitoring': LiveMonitoring.init(); break;
      case 'hotspot-intelligence': HotspotIntelligence.init(); break;
      case 'ai-vision': AIVision.init(); break;
      case 'decision-engine': DecisionEngine.init(); break;
      case 'interventions': Interventions.init(); break;
      case 'recovery-circularity': RecoveryCircularity.init(); break;
      case 'analytics': Analytics.init(); break;
      case 'field-nodes': FieldNodes.init(); break;
      case 'settings': SettingsPage.init(); break;
      case 'demo-mode':
        DemoMode._renderTimeline && DemoMode._renderTimeline();
        break;
    }
  },

  // ─── TOPBAR ──────────────────────────────────────────────────
  _initTopbar() {
    // Simulation toggle
    const simToggle = document.getElementById('sim-toggle');
    if (simToggle) {
      simToggle.addEventListener('click', () => {
        this.simActive = !this.simActive;
        AppState.simActive = this.simActive;
        simToggle.classList.toggle('active', this.simActive);
        const label = simToggle.querySelector('.sim-label');
        if (label) label.textContent = this.simActive ? 'SIM ON' : 'SIMULATION';
        Toast.show(
          this.simActive ? 'info' : 'info',
          this.simActive ? 'Simulation Active' : 'Simulation Paused',
          this.simActive ? 'Real-time updates streaming' : 'Chart updates paused',
          2000
        );
      });
    }
  },

  // ─── NOTIFICATION PANEL ──────────────────────────────────────
  _initNotifPanel() {
    const btn = document.getElementById('btn-notif');
    const panel = document.getElementById('notif-panel');
    const badge = document.querySelector('.notif-badge');

    if (btn && panel) {
      btn.addEventListener('click', () => {
        panel.classList.toggle('open');
        if (panel.classList.contains('open') && badge) {
          badge.textContent = '0';
        }
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !panel.contains(e.target)) {
          panel.classList.remove('open');
        }
      });
    }
  },

  // ─── WEBSOCKET HANDLERS ───────────────────────────────────────
  _initWsHandlers() {
    CGSocket.on('ws_connected', () => {
      const dot = document.querySelector('.sidebar-status .status-dot');
      if (dot) { dot.classList.remove('warning'); }
      const statusText = document.querySelector('.sidebar-status .status-text');
      if (statusText) statusText.textContent = 'SYSTEM OPERATIONAL';
      // Update system health bar WebSocket status dynamically
      const wsStatus = document.getElementById('sys-ws-status');
      if (wsStatus) {
        wsStatus.textContent = 'CONNECTED';
        wsStatus.style.color = 'var(--status-good)';
      }
    });

    CGSocket.on('ws_disconnected', () => {
      const dot = document.querySelector('.sidebar-status .status-dot');
      if (dot) dot.classList.add('warning');
      const statusText = document.querySelector('.sidebar-status .status-text');
      if (statusText) statusText.textContent = 'RECONNECTING...';
      // Update system health bar
      const wsStatus = document.getElementById('sys-ws-status');
      if (wsStatus) {
        wsStatus.textContent = 'RECONNECTING';
        wsStatus.style.color = 'var(--status-high)';
      }
    });

    CGSocket.on('alert_created', (data) => {
      if (data?.alert) {
        AppState.addAlert(data.alert);
        const badge = document.querySelector('.notif-badge');
        if (badge) {
          const count = parseInt(badge.textContent || '0') + 1;
          badge.textContent = count > 9 ? '9+' : count;
        }
      }
    });

    CGSocket.on('simulation_mode', (data) => {
      const modeEl = document.getElementById('sim-mode-indicator');
      if (modeEl && data?.mode) modeEl.textContent = data.mode.toUpperCase();
    });
  },

  // ─── SIM MODE SELECTOR ───────────────────────────────────────
  _initSimModeSelector() {
    const select = document.getElementById('sim-mode-select');
    if (!select) return;
    select.addEventListener('change', async () => {
      try {
        await API.setSimMode(select.value);
        Toast.show('info', 'Simulation Mode', `Changed to: ${select.value.toUpperCase()}`, 2000);
      } catch (e) {
        Toast.show('critical', 'Error', 'Failed to change simulation mode');
      }
    });
  }
};

// Global navigation helper
function navigateTo(pageId) {
  App.navigateTo(pageId);
}

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
