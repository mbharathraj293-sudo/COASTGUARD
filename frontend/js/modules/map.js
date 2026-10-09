/**
 * COASTGUARD - Map Module
 * Leaflet-based coastal intelligence map (Light Executive Theme).
 */

const MapModule = {
  maps: {},
  layers: {},
  markers: {},

  _getMarkerColor(status) {
    return {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#16a34a',
      online: '#16a34a',
      warning: '#ea580c',
      offline: '#94a3b8'
    }[status] || '#64748b';
  },

  _createHotspotIcon(hotspot) {
    const color = this._getMarkerColor(hotspot.status);
    const isPulsing = hotspot.status === 'critical';
    const size = hotspot.status === 'critical' ? 34 : 28;
    
    return L.divIcon({
      className: '',
      html: `
        <div style="
          position: relative;
          width: ${size}px; height: ${size}px;
        ">
          ${isPulsing ? `<div style="
            position: absolute; inset: -4px;
            border-radius: 50%;
            background: ${color};
            opacity: 0.25;
            animation: pulse-dot 2s infinite;
          "></div>` : ''}
          <div style="
            width: ${size}px; height: ${size}px;
            border-radius: 50%;
            background: #ffffff;
            border: 2.5px solid ${color};
            display: flex; align-items: center; justify-content: center;
            font-family: JetBrains Mono, monospace;
            font-size: ${size > 28 ? 11 : 10}px;
            font-weight: 800;
            color: ${color};
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
          ">${hotspot.priorityScore}</div>
        </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    });
  },

  _createNodeIcon(node) {
    const color = this._getMarkerColor(node.status);
    return L.divIcon({
      className: '',
      html: `
        <div style="
          width: 12px; height: 12px;
          border-radius: 50%;
          background: ${color};
          border: 2.5px solid #ffffff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
        "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  },

  _buildPopup(hotspot) {
    const scoreColor = this._getMarkerColor(hotspot.status);
    return `
      <div style="min-width: 190px; font-family: 'Inter', sans-serif;">
        <div class="popup-node-id" style="font-size:12px; font-weight:800; color:#0f766e; font-family:'JetBrains Mono',monospace;">${hotspot.nodeId}</div>
        <div class="popup-location" style="font-size:11px; color:#64748b; margin:2px 0 8px;">${hotspot.location || ''}</div>
        <div class="popup-score" style="color:${scoreColor}; font-size:24px; font-weight:800; font-family:'JetBrains Mono',monospace;">${hotspot.priorityScore} <span style="font-size:12px; color:#94a3b8; font-weight:500;">/ 100</span></div>
        <div style="font-size:9px; font-weight:700; color:#64748b; letter-spacing:1px; margin-bottom:8px; text-transform:uppercase;">PRIORITY SCORE</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          <span style="font-size:9px; font-weight:700; letter-spacing:0.5px; padding:2px 8px; border-radius:4px; background:${scoreColor}15; color:${scoreColor}; border:1px solid ${scoreColor}30;">${hotspot.recommendation || 'MONITOR'}</span>
          <span style="font-size:10px; color:#334155; font-weight:600;">${hotspot.name}</span>
        </div>
        <div style="margin-top:8px; padding-top:6px; border-top:1px solid #f1f5f9; font-size:10px; color:#64748b; display:flex; justify-content:space-between;">
          <span>Severity: <strong style="color:#0f172a;">${Math.round((hotspot.severity || 0) * 100)}%</strong></span>
          <span>Recurrence: <strong style="color:#0f172a;">${hotspot.recurrenceCount || 0}</strong></span>
        </div>
      </div>`;
  },

  initMap(containerId, options = {}) {
    const defaultOpts = {
      center: [19.07, 72.87],
      zoom: 11,
      minZoom: 9,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: false
    };

    const map = L.map(containerId, { ...defaultOpts, ...options });

    // Reliable keyless OpenStreetMap tiles (no API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    this.maps[containerId] = map;
    this.markers[containerId] = {};
    return map;
  },

  renderHotspots(mapId, hotspots) {
    const map = this.maps[mapId];
    if (!map) return;

    const existingIds = new Set(Object.keys(this.markers[mapId] || {}));
    const newIds = new Set();

    hotspots.forEach(hotspot => {
      if (!hotspot.lat || !hotspot.lng) return;
      newIds.add(hotspot.nodeId);

      if (this.markers[mapId][hotspot.nodeId]) {
        // Update existing marker
        const marker = this.markers[mapId][hotspot.nodeId];
        marker.setIcon(this._createHotspotIcon(hotspot));
        marker.getPopup()?.setContent(this._buildPopup(hotspot));
      } else {
        // Create new marker
        const marker = L.marker([hotspot.lat, hotspot.lng], {
          icon: this._createHotspotIcon(hotspot),
          zIndexOffset: hotspot.status === 'critical' ? 1000 : 0
        });
        marker.bindPopup(this._buildPopup(hotspot), { maxWidth: 240 });
        marker.addTo(map);
        marker.on('click', () => {
          AppState.update('selectedNodeId', hotspot.nodeId);
          this._onMarkerClick && this._onMarkerClick(hotspot.nodeId);
        });
        this.markers[mapId][hotspot.nodeId] = marker;
      }
    });

    // Remove stale markers
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        this.markers[mapId][id]?.remove();
        delete this.markers[mapId][id];
      }
    });
  },

  onMarkerClick(handler) {
    this._onMarkerClick = handler;
  },

  focusNode(mapId, nodeId, hotspots) {
    const map = this.maps[mapId];
    const hotspot = hotspots?.find ? hotspots.find(h => h.nodeId === nodeId) :
      Object.values(hotspots || {}).find(h => h.nodeId === nodeId);
    if (map && hotspot) {
      map.setView([hotspot.lat, hotspot.lng], 14, { animate: true });
      this.markers[mapId][nodeId]?.openPopup();
    }
  },

  invalidateSize(mapId) {
    setTimeout(() => this.maps[mapId]?.invalidateSize(), 100);
  }
};

window.MapModule = MapModule;
