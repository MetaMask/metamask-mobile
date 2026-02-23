import {
  enableApiCallLogs,
  getMockServerPortInApp,
  isE2E,
} from '../../util/test/utils';

interface E2EProxyPatchScriptParams {
  mockServerPort: string;
  platform: string;
  snapId: string;
}

/**
 * Build a script to patch fetch/XMLHttpRequest inside the Snaps WebView runtime.
 * This makes Snap network access visible in the E2E proxy the same way as app requests.
 */
export const buildE2EProxyPatchScript = ({
  mockServerPort,
  platform,
  snapId,
}: E2EProxyPatchScriptParams): string => {
  const proxyCandidates =
    platform === 'android'
      ? ['http://localhost', 'http://10.0.2.2']
      : ['http://localhost'];

  return `
    (() => {
      try {
        const mockServerPort = ${JSON.stringify(mockServerPort)};
        const proxyCandidates = ${JSON.stringify(proxyCandidates)}.map(
          (host) => \`\${host}:\${mockServerPort}\`,
        );
        const snapProxySource = 'snap-webview';
        const snapId = ${JSON.stringify(snapId)};

        const buildProxyUrl = (proxyBaseUrl, targetUrl) =>
          \`\${proxyBaseUrl}/proxy?source=\${snapProxySource}&snapId=\${encodeURIComponent(snapId)}&url=\${encodeURIComponent(targetUrl)}\`;

        const shouldProxyUrl = (targetUrl) =>
          typeof targetUrl === 'string' &&
          /^https?:\\/\\//.test(targetUrl) &&
          !targetUrl.includes('/proxy?') &&
          !proxyCandidates.some((candidate) => targetUrl.startsWith(candidate));

        const patchWindowNetworkApis = (targetWindow) => {
          if (!targetWindow || targetWindow.__MM_E2E_SNAP_PROXY_PATCHED__) {
            return;
          }
          targetWindow.__MM_E2E_SNAP_PROXY_PATCHED__ = true;

          const toUrlString = (input) => {
            if (typeof input === 'string') {
              return input;
            }
            if (
              typeof targetWindow.URL !== 'undefined' &&
              input instanceof targetWindow.URL
            ) {
              return input.toString();
            }
            if (input && typeof input === 'object' && typeof input.url === 'string') {
              return input.url;
            }
            return String(input);
          };

          if (typeof targetWindow.fetch === 'function') {
            const originalFetch = targetWindow.fetch.bind(targetWindow);
            targetWindow.fetch = async (input, init) => {
              const targetUrl = toUrlString(input);
              if (!shouldProxyUrl(targetUrl)) {
                return originalFetch(input, init);
              }

              let lastError;
              for (const proxyBaseUrl of proxyCandidates) {
                try {
                  return await originalFetch(
                    buildProxyUrl(proxyBaseUrl, targetUrl),
                    init,
                  );
                } catch (error) {
                  lastError = error;
                }
              }

              if (lastError) {
                return originalFetch(input, init);
              }
              return originalFetch(input, init);
            };
          }

          const OriginalXHR = targetWindow.XMLHttpRequest;
          if (typeof OriginalXHR === 'function') {
            targetWindow.XMLHttpRequest = function (...args) {
              const xhr = new OriginalXHR(...args);
              const originalOpen = xhr.open;
              xhr.open = function (method, url, ...openArgs) {
                const targetUrl = toUrlString(url);
                if (shouldProxyUrl(targetUrl)) {
                  const proxiedUrl = buildProxyUrl(proxyCandidates[0], targetUrl);
                  return originalOpen.call(this, method, proxiedUrl, ...openArgs);
                }
                return originalOpen.call(this, method, url, ...openArgs);
              };
              return xhr;
            };
            try {
              Object.setPrototypeOf(targetWindow.XMLHttpRequest, OriginalXHR);
              Object.assign(targetWindow.XMLHttpRequest, OriginalXHR);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.log('[SNAPS E2E PROXY] Failed to copy XHR properties', error);
            }
          }

          try {
            const OriginalWebSocket = targetWindow.WebSocket;
            if (typeof OriginalWebSocket === 'function') {
              targetWindow.WebSocket = function PatchedWebSocket(url, protocols) {
                if (!/solana.*infura\\.io/i.test(url)) {
                  if (protocols !== undefined) {
                    return new OriginalWebSocket(url, protocols);
                  }
                  return new OriginalWebSocket(url);
                }

                console.log('[SNAPS E2E WS_MOCK] Intercepting WebSocket: ' + url);

                var _listeners = {};
                var _subIdCounter = 8648699534240963;

                function dispatch(type, detail) {
                  var evt = { type: type, data: detail, target: ws, currentTarget: ws };
                  var arr = _listeners[type] || [];
                  for (var i = 0; i < arr.length; i++) {
                    try { arr[i](evt); } catch (e) {}
                  }
                  if (typeof ws['on' + type] === 'function') {
                    try { ws['on' + type](evt); } catch (e) {}
                  }
                }

                var ws = {
                  url: url,
                  readyState: 0,
                  protocol: '',
                  extensions: '',
                  bufferedAmount: 0,
                  binaryType: 'blob',
                  CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3,
                  onopen: null, onclose: null, onmessage: null, onerror: null,
                  addEventListener: function(type, fn) {
                    if (!_listeners[type]) _listeners[type] = [];
                    _listeners[type].push(fn);
                  },
                  removeEventListener: function(type, fn) {
                    if (_listeners[type]) {
                      _listeners[type] = _listeners[type].filter(function(l) { return l !== fn; });
                    }
                  },
                  dispatchEvent: function(evt) { dispatch(evt.type, evt.data); return true; },
                  send: function(data) {
                    try {
                      var msg = JSON.parse(data);
                      var method = msg.method;
                      var reqId = msg.id;
                      console.log('[SNAPS E2E WS_MOCK] WS send: method=' + method + ' id=' + reqId);

                      if (method === 'signatureSubscribe') {
                        var subId = _subIdCounter++;
                        setTimeout(function() {
                          dispatch('message', JSON.stringify({ jsonrpc: '2.0', result: subId, id: reqId }));
                        }, 300);
                        setTimeout(function() {
                          dispatch('message', JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'signatureNotification',
                            params: {
                              result: { context: { slot: 342840492 }, value: { err: null } },
                              subscription: subId,
                            },
                          }));
                        }, 1500);
                      } else if (method === 'accountSubscribe' || method === 'programSubscribe') {
                        var subId2 = _subIdCounter++;
                        setTimeout(function() {
                          dispatch('message', JSON.stringify({ jsonrpc: '2.0', result: subId2, id: reqId }));
                        }, 300);
                      } else if (reqId !== undefined) {
                        setTimeout(function() {
                          dispatch('message', JSON.stringify({ jsonrpc: '2.0', result: true, id: reqId }));
                        }, 300);
                      }
                    } catch (e) {
                      console.log('[SNAPS E2E WS_MOCK] send error: ' + e.message);
                    }
                  },
                  close: function() {
                    ws.readyState = 3;
                    dispatch('close', undefined);
                  },
                };

                setTimeout(function() {
                  ws.readyState = 1;
                  dispatch('open', undefined);
                }, 100);

                return ws;
              };
              try {
                Object.setPrototypeOf(targetWindow.WebSocket, OriginalWebSocket);
                targetWindow.WebSocket.CONNECTING = 0;
                targetWindow.WebSocket.OPEN = 1;
                targetWindow.WebSocket.CLOSING = 2;
                targetWindow.WebSocket.CLOSED = 3;
              } catch (e) {}
            }
          } catch (wsError) {
            console.log('[SNAPS E2E WS_MOCK] WebSocket patch failed: ' + wsError.message);
          }
        };

        const patchIframeElement = (iframe) => {
          if (!iframe || typeof iframe.addEventListener !== 'function') {
            return;
          }

          const patchIframeWindow = () => {
            try {
              patchWindowNetworkApis(iframe.contentWindow);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.log('[SNAPS E2E PROXY] Failed to patch iframe', error);
            }
          };

          patchIframeWindow();
          iframe.addEventListener('load', patchIframeWindow);
        };

        patchWindowNetworkApis(window);

        try {
          document.querySelectorAll('iframe').forEach((iframe) => {
            patchIframeElement(iframe);
          });
        } catch {
          // no-op
        }

        try {
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLIFrameElement) {
                  patchIframeElement(node);
                } else if (
                  node instanceof HTMLElement &&
                  typeof node.querySelectorAll === 'function'
                ) {
                  node.querySelectorAll('iframe').forEach((iframe) => {
                    patchIframeElement(iframe);
                  });
                }
              });
            }
          });
          observer.observe(document.documentElement || document.body, {
            childList: true,
            subtree: true,
          });
        } catch {
          // no-op
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('[SNAPS E2E PROXY] Failed to patch network APIs', error);
      }
    })();
    true;
  `;
};

export const shouldPatchSnapsWebViewProxy = () => isE2E || enableApiCallLogs;

export { getMockServerPortInApp };
