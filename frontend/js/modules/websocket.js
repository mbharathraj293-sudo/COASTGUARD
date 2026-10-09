/**
 * COASTGUARD - WebSocket Client
 * Manages real-time connection and event dispatching.
 */

class CoastguardWS {
  constructor() {
    this.ws = null;
    this.listeners = {};
    this.reconnectDelay = 2000;
    this.connected = false;
    this._connect();
  }

  _connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}`;
    
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      console.log('[WS] Connected to COASTGUARD');
      this.reconnectDelay = 2000;
      this._emit('ws_connected', {});
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        this._emit(msg.type, msg.data || msg);
      } catch (e) { /* ignore parse errors */ }
    };

    this.ws.onclose = () => {
      this.connected = false;
      console.log(`[WS] Disconnected. Reconnecting in ${this.reconnectDelay}ms...`);
      this._emit('ws_disconnected', {});
      setTimeout(() => this._connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 15000);
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  on(eventType, handler) {
    if (!this.listeners[eventType]) this.listeners[eventType] = [];
    this.listeners[eventType].push(handler);
    return () => this.off(eventType, handler);
  }

  off(eventType, handler) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(h => h !== handler);
    }
  }

  _emit(eventType, data) {
    (this.listeners[eventType] || []).forEach(h => {
      try { h(data); } catch (e) { console.error('[WS] Handler error:', e); }
    });
    // Also emit to 'all' listeners
    (this.listeners['*'] || []).forEach(h => {
      try { h({ type: eventType, data }); } catch (e) { /* ignore */ }
    });
  }
}

window.CGSocket = new CoastguardWS();
