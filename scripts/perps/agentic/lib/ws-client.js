'use strict';

/* global globalThis */

/**
 * Minimal CDP client using the built-in ws-like interface over raw WebSocket.
 * Node 22+ has a built-in WebSocket; for older versions we use the ws package
 * that ships with React Native / Metro dev dependencies.
 */
function createWSClient(wsUrl, timeout) {
  return new Promise((resolve, reject) => {
    let WebSocketImpl;
    // Node 22+ has globalThis.WebSocket
    if (typeof globalThis.WebSocket === 'function') {
      WebSocketImpl = globalThis.WebSocket;
    } else {
      try {
        // Dynamic require avoids depcheck static analysis — ws is an optional
        // fallback for Node < 22 which has no built-in WebSocket.
        const wsModule = 'ws';
        WebSocketImpl = require(wsModule);
      } catch {
        throw new Error(
          'WebSocket not available. Install "ws" package or use Node >= 22.',
        );
      }
    }

    const ws = new WebSocketImpl(wsUrl);
    let msgId = 0;
    const pending = new Map();

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`CDP connection timeout after ${timeout}ms`));
    }, timeout);

    ws.onopen = () => {
      clearTimeout(timer);
      resolve({
        /** Send a CDP command and wait for the response */
        send(method, params = {}, msgTimeout = timeout) {
          return new Promise((res, rej) => {
            const id = ++msgId;
            const timer = setTimeout(() => {
              pending.delete(id);
              rej(
                new Error(
                  `CDP message timeout after ${msgTimeout}ms for ${method}`,
                ),
              );
            }, msgTimeout);
            pending.set(id, {
              resolve: (v) => {
                clearTimeout(timer);
                res(v);
              },
              reject: (e) => {
                clearTimeout(timer);
                rej(e);
              },
            });
            const msg = JSON.stringify({ id, method, params });
            ws.send(msg);
          });
        },
        close() {
          ws.close();
        },
      });
    };

    ws.onmessage = (evt) => {
      const data = typeof evt.data === 'string' ? evt.data : evt.data.toString();
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        // Non-JSON frame — ignore
        return;
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) {
          rej(new Error(`CDP error: ${JSON.stringify(msg.error)}`));
        } else {
          res(msg.result);
        }
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timer);
      reject(new Error(`WebSocket error: ${err.message || err}`));
    };

    ws.onclose = () => {
      clearTimeout(timer);
      for (const [, { reject: rej }] of pending) {
        rej(new Error('WebSocket closed'));
      }
      pending.clear();
    };
  });
}

module.exports = { createWSClient };
