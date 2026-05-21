///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
/**
 * Creates a patched version of the Snaps execution environment HTML
 * that intercepts fetch calls and routes them through the E2E mock server.
 *
 * This is necessary because:
 * 1. Snaps with `endowment:network-access` can call fetch() directly from WebView
 * 2. These calls bypass the React Native shim.js proxy
 * 3. The E2E Mockttp server never sees these requests
 *
 * By injecting a fetch interceptor at the very top of the HTML (before SES lockdown),
 * we can route all WebView fetch traffic through the mock server's /proxy endpoint.
 */

// @ts-expect-error Types are currently broken for this.
import OriginalWebViewHTML from '@metamask/snaps-execution-environments/dist/webpack/webview/index.html';

/**
 * The fetch interceptor script that gets injected before SES lockdown.
 * This MUST run before SES because SES will freeze/harden the fetch function.
 *
 * @param mockServerUrl - The URL of the mock server (e.g., http://localhost:8000)
 * @returns The JavaScript code to inject
 */
function createFetchInterceptorScript(mockServerUrl: string): string {
  return `
<script>
(function() {
  // E2E Fetch Interceptor - Injected before SES lockdown
  // Routes all fetch calls through the mock server proxy
  var MOCK_SERVER_URL = '${mockServerUrl}';
  var originalFetch = window.fetch;
  var originalXHR = window.XMLHttpRequest;
  
  // Intercept fetch
  window.fetch = async function(input, init) {
    var url = input;
    var effectiveInit = init;
    
    // Handle Request object
    if (typeof input === 'object' && input instanceof Request) {
      url = input.url;
      if (!init) {
        var clonedReq = input.clone();
        effectiveInit = {
          method: input.method,
          headers: input.headers,
          body: clonedReq.body,
          mode: input.mode,
          credentials: input.credentials,
          cache: input.cache,
          redirect: input.redirect,
          referrer: input.referrer,
          integrity: input.integrity
        };
      }
    } else if (typeof input === 'object' && input.url) {
      url = input.url;
    }
    
    // Only proxy external HTTP/HTTPS URLs
    var shouldProxy = typeof url === 'string' && 
                      (url.startsWith('http://') || url.startsWith('https://')) &&
                      !url.includes(MOCK_SERVER_URL);
    
    var actualUrl = shouldProxy 
      ? MOCK_SERVER_URL + '/proxy?url=' + encodeURIComponent(url)
      : url;
    
    return originalFetch(actualUrl, effectiveInit);
  };
  
  // Intercept XMLHttpRequest
  window.XMLHttpRequest = function() {
    var xhr = new originalXHR();
    var originalOpen = xhr.open;
    
    xhr.open = function(method, url) {
      var args = Array.prototype.slice.call(arguments);
      
      var shouldProxy = typeof url === 'string' && 
                        (url.startsWith('http://') || url.startsWith('https://')) &&
                        !url.includes(MOCK_SERVER_URL);
      
      if (shouldProxy) {
        args[1] = MOCK_SERVER_URL + '/proxy?url=' + encodeURIComponent(url);
      }
      
      return originalOpen.apply(this, args);
    };
    
    return xhr;
  };
  
  // Copy static properties from original XMLHttpRequest
  Object.keys(originalXHR).forEach(function(key) {
    try {
      window.XMLHttpRequest[key] = originalXHR[key];
    } catch (e) {
      // Ignore non-writable properties
    }
  });
  
  // Mock WebSocket for Solana RPC to handle signatureSubscribe
  var OriginalWebSocket = window.WebSocket;
  var subscriptionIdCounter = 0;
  
  window.WebSocket = function(url, protocols) {
    // Check if this is a Solana RPC WebSocket
    var isSolanaWs = typeof url === 'string' && 
                     (url.includes('solana-mainnet') || url.includes('solana-devnet'));
    
    if (!isSolanaWs) {
      return protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);
    }
    
    // Create a mock WebSocket object for Solana
    var mockWs = {
      url: url,
      readyState: 0,
      protocol: '',
      extensions: '',
      bufferedAmount: 0,
      binaryType: 'blob',
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      _eventListeners: { open: [], close: [], message: [], error: [] },
      
      addEventListener: function(type, listener) {
        if (this._eventListeners[type]) {
          this._eventListeners[type].push(listener);
        }
      },
      
      removeEventListener: function(type, listener) {
        if (this._eventListeners[type]) {
          var idx = this._eventListeners[type].indexOf(listener);
          if (idx !== -1) this._eventListeners[type].splice(idx, 1);
        }
      },
      
      dispatchEvent: function(event) {
        var listeners = this._eventListeners[event.type] || [];
        for (var i = 0; i < listeners.length; i++) {
          try { listeners[i](event); } catch (e) { console.error(e); }
        }
        var handler = this['on' + event.type];
        if (handler) {
          try { handler(event); } catch (e) { console.error(e); }
        }
        return true;
      },
      
      send: function(data) {
        var self = this;
        try {
          var msg = JSON.parse(data);
          if (msg.method === 'signatureSubscribe') {
            var subId = ++subscriptionIdCounter;
            
            // Send subscription confirmation
            setTimeout(function() {
              self.dispatchEvent({ 
                type: 'message', 
                data: JSON.stringify({ jsonrpc: '2.0', result: subId, id: msg.id })
              });
              
              // Send transaction confirmation
              setTimeout(function() {
                self.dispatchEvent({ 
                  type: 'message', 
                  data: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'signatureNotification',
                    params: {
                      result: { context: { slot: 343287088 }, value: { err: null } },
                      subscription: subId
                    }
                  })
                });
              }, 500);
            }, 100);
          }
        } catch (e) {
          // Ignore parse errors
        }
      },
      
      close: function(code, reason) {
        this.readyState = 2;
        var self = this;
        setTimeout(function() {
          self.readyState = 3;
          self.dispatchEvent({ type: 'close', code: code || 1000, reason: reason || '' });
        }, 0);
      }
    };
    
    // Simulate connection opening
    setTimeout(function() {
      mockWs.readyState = 1;
      mockWs.dispatchEvent({ type: 'open' });
    }, 50);
    
    return mockWs;
  };
  
  // Copy static properties
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;
})();
</script>
`;
}

/**
 * Creates a patched version of the Snaps execution environment HTML
 * that routes fetch calls through the E2E mock server.
 *
 * @param mockServerPort - The port of the mock server
 * @param mockServerHost - The host of the mock server (default: localhost)
 * @returns The patched HTML string
 */
export function createPatchedSnapsHTML(
  mockServerPort: number,
  mockServerHost: string = 'localhost',
): string {
  const mockServerUrl = `http://${mockServerHost}:${mockServerPort}`;
  const interceptorScript = createFetchInterceptorScript(mockServerUrl);

  // Inject the interceptor script right after the opening <head> tag
  // This ensures it runs before the SES lockdown script
  return OriginalWebViewHTML.replace('<head>', '<head>' + interceptorScript);
}

/**
 * Checks if E2E patching is enabled based on environment
 */
export function isE2EPatchingEnabled(): boolean {
  // Check for E2E test environment indicators
  // This should match the conditions in shim.js
  return (
    process.env.IS_TEST === 'true' || process.env.METAMASK_ENVIRONMENT === 'e2e'
  );
}

export default createPatchedSnapsHTML;
///: END:ONLY_INCLUDE_IF
