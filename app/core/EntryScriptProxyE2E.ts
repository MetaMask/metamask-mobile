import { Platform } from 'react-native';
import { LaunchArguments } from 'react-native-launch-arguments';
import {
  isE2E,
  FALLBACK_COMMAND_QUEUE_SERVER_PORT,
  testConfig,
} from '../util/test/utils';
import { defaultMockPort } from '../../tests/api-mocking/mock-config/mockUrlCollection.json';

// Fallback port for mock server - same pattern as FixtureServer
// Android: Uses fallback port (adb reverse maps it to actual port)
// iOS: Uses actual port from LaunchArguments
const FALLBACK_MOCKSERVER_PORT = defaultMockPort || 8000;

/**
 * The E2E proxy script that gets injected into the WebView.
 * This script patches fetch and XMLHttpRequest to route through the mock server.
 *
 * This is embedded directly rather than loaded from a file to avoid
 * complex build configuration changes.
 */
const INPAGE_PROXY_SCRIPT = `
(function () {
  'use strict';

  // Check if E2E config is available
  if (!window.__E2E_MOCK_CONFIG__) {
    return;
  }

  var config = window.__E2E_MOCK_CONFIG__;
  var mockServerPort = config.mockServerPort;
  var isAndroid = config.isAndroid;
  var commandQueueServerPort = config.commandQueueServerPort;

  var originalFetch = window.fetch;
  var OriginalXHR = window.XMLHttpRequest;

  // Try multiple hosts to find available mock server
  var hosts = ['localhost'];
  if (isAndroid) {
    hosts.push('10.0.2.2');
  }

  var MOCKTTP_URL = '';
  var isMockServerAvailable = false;

  function isLocalUrl(url) {
    try {
      var parsed = new URL(url);
      return (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '10.0.2.2'
      );
    } catch (e) {
      return false;
    }
  }

  function isCommandQueueUrl(url) {
    try {
      var parsed = new URL(url);
      return (
        isLocalUrl(url) && parsed.port === String(commandQueueServerPort)
      );
    } catch (e) {
      return false;
    }
  }

  function isMockServerUrl(url) {
    return (
      url.includes('localhost:' + mockServerPort) ||
      url.includes('10.0.2.2:' + mockServerPort) ||
      url.includes('/proxy')
    );
  }

  (async function init() {
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      var testUrl = 'http://' + host + ':' + mockServerPort;

      try {
        var res = await originalFetch(testUrl + '/health-check');
        if (res.ok) {
          MOCKTTP_URL = testUrl;
          isMockServerAvailable = true;
          console.log('[E2E WebView] Mock server connected via ' + host);
          break;
        }
      } catch (e) {
        console.log('[E2E WebView] ' + host + ' health check failed: ' + e.message);
      }
    }

    if (!isMockServerAvailable) {
      console.warn('[E2E WebView] Mock server not available, using original fetch');
      return;
    }

    // Patch fetch
    window.fetch = async function (url, options) {
      var urlString;
      if (typeof url === 'string') {
        urlString = url;
      } else if (url instanceof URL) {
        urlString = url.href;
      } else if (url && typeof url === 'object' && url.url) {
        urlString = url.url;
      } else {
        urlString = String(url);
      }

      if (isCommandQueueUrl(urlString) || isMockServerUrl(urlString)) {
        return originalFetch(url, options);
      }

      if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
        try {
          return await originalFetch(
            MOCKTTP_URL + '/proxy?url=' + encodeURIComponent(urlString),
            options
          );
        } catch (e) {
          return originalFetch(url, options);
        }
      }

      return originalFetch(url, options);
    };

    // Patch XMLHttpRequest
    if (OriginalXHR) {
      window.XMLHttpRequest = function () {
        var xhr = new OriginalXHR();
        var originalOpen = xhr.open;

        xhr.open = function (method, url) {
          var openArgs = Array.prototype.slice.call(arguments, 2);

          try {
            if (
              typeof url === 'string' &&
              (url.startsWith('http://') || url.startsWith('https://'))
            ) {
              if (isCommandQueueUrl(url) || isMockServerUrl(url)) {
                return originalOpen.apply(this, [method, url].concat(openArgs));
              }
              url = MOCKTTP_URL + '/proxy?url=' + encodeURIComponent(url);
            }
            return originalOpen.apply(this, [method, url].concat(openArgs));
          } catch (error) {
            return originalOpen.apply(this, [method, url].concat(openArgs));
          }
        };

        return xhr;
      };

      try {
        Object.setPrototypeOf(window.XMLHttpRequest, OriginalXHR);
        Object.assign(window.XMLHttpRequest, OriginalXHR);
        window.__E2E_XHR_PATCHED = true;
        console.log('[E2E WebView] Successfully patched XMLHttpRequest');
      } catch (error) {
        console.warn('[E2E WebView] Failed to copy XHR properties:', error);
        window.XMLHttpRequest = OriginalXHR;
      }
    }

    console.log('[E2E WebView] Fetch and XHR patching complete');
  })();
})();
`;

interface LaunchArgsType {
  mockServerPort?: string;
  commandQueueServerPort?: string;
}

interface TestConfigType {
  fixtureServerPort?: number;
  commandQueueServerPort?: number;
}

const EntryScriptProxyE2E = {
  cachedScript: null as string | null,
  cachedMockServerUrl: null as string | null,

  /**
   * Get the mock server port based on platform.
   * Android: Uses fallback port (adb reverse maps to actual)
   * iOS: Uses actual port from LaunchArguments
   */
  getMockServerPort(): number {
    const raw = LaunchArguments.value() as LaunchArgsType;
    return Platform.OS === 'android'
      ? FALLBACK_MOCKSERVER_PORT
      : Number(raw?.mockServerPort ?? FALLBACK_MOCKSERVER_PORT);
  },

  /**
   * Get the mock server URL for native WebView interception.
   * Returns the URL that the native code should use to proxy requests.
   */
  getMockServerUrl(): string | undefined {
    if (!isE2E) {
      return undefined;
    }

    if (this.cachedMockServerUrl) {
      return this.cachedMockServerUrl;
    }

    const port = this.getMockServerPort();
    // Use localhost for both platforms - adb reverse handles Android mapping
    this.cachedMockServerUrl = `http://localhost:${port}`;
    return this.cachedMockServerUrl;
  },

  /**
   * Get the E2E proxy script with configuration prepended.
   * Returns empty string if not in E2E mode.
   */
  get(): string {
    // Only return script in E2E mode
    if (!isE2E) {
      return '';
    }

    // Return cached if available
    if (this.cachedScript) {
      return this.cachedScript;
    }

    const mockServerPort = this.getMockServerPort();
    const commandQueueServerPort =
      (testConfig as TestConfigType).commandQueueServerPort ??
      FALLBACK_COMMAND_QUEUE_SERVER_PORT;

    // Create the configuration that will be injected before the script
    const config = `window.__E2E_MOCK_CONFIG__ = {
  mockServerPort: ${mockServerPort},
  isAndroid: ${Platform.OS === 'android'},
  commandQueueServerPort: ${commandQueueServerPort}
};`;

    this.cachedScript = config + INPAGE_PROXY_SCRIPT;
    return this.cachedScript;
  },

  /**
   * Clear the cached script and URL (useful for testing)
   */
  clearCache(): void {
    this.cachedScript = null;
    this.cachedMockServerUrl = null;
  },
};

export default EntryScriptProxyE2E;
