/**
 * COASTGUARD - Toast / Notification System
 */

const Toast = {
  _container: null,
  _notifList: [],

  init() {
    this._container = document.getElementById('toast-container');
  },

  show(type, title, message, duration = 4000) {
    const icons = { critical: '🚨', warning: '⚠️', info: '✅', detection: '🔍' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '📡'}</span>
      <div>
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;

    this._container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    // Store in notification list
    this._notifList.unshift({
      type, title, message,
      timestamp: new Date().toISOString()
    });
    
    // Update notification panel
    this._renderNotifPanel();
    
    // Update badge
    const badge = document.querySelector('.notif-badge');
    if (badge) {
      const count = parseInt(badge.textContent || '0') + 1;
      badge.textContent = count > 9 ? '9+' : count;
    }
  },

  _renderNotifPanel() {
    const panel = document.getElementById('notif-list');
    if (!panel) return;
    panel.innerHTML = this._notifList.slice(0, 20).map(n => `
      <div class="alert-item ${n.type}">
        <span class="alert-icon">${n.type === 'critical' ? '🚨' : n.type === 'warning' ? '⚠️' : '✅'}</span>
        <div class="alert-content">
          <div class="alert-title">${n.title}</div>
          <div class="alert-message">${n.message}</div>
          <div class="alert-time">${formatTime(n.timestamp)}</div>
        </div>
      </div>
    `).join('');
  },

  clearBadge() {
    const badge = document.querySelector('.notif-badge');
    if (badge) badge.textContent = '0';
  }
};

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtBurden(val) {
  if (val >= 0.75) return '<span class="text-critical">HIGH</span>';
  if (val >= 0.5) return '<span class="text-warning">MEDIUM</span>';
  return '<span class="text-accent">LOW</span>';
}

function statusBadge(status) {
  const map = {
    online: 'badge-online', warning: 'badge-warning', offline: 'badge-offline',
    critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low'
  };
  return `<span class="badge ${map[status] || ''}">${status.toUpperCase()}</span>`;
}

function recommendationTag(rec) {
  if (!rec) return '';
  const cls = rec.includes('ACT') ? 'act-now' : rec.includes('VERIFY') ? 'verify' : 'monitor';
  return `<span class="recommendation-tag ${cls}">${rec}</span>`;
}

function priorityColor(score) {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

window.Toast = Toast;
window.formatTime = formatTime;
window.formatDateTime = formatDateTime;
window.fmtBurden = fmtBurden;
window.statusBadge = statusBadge;
window.recommendationTag = recommendationTag;
window.priorityColor = priorityColor;
