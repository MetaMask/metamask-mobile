/**
 * Tests for shim.js.
 *
 * Event/EventTarget/CloseEvent/MessageEvent polyfills:
 *
 * The core fix (TAT-3223) ensures polyfilled globals use React Native's own
 * Event classes for instanceof compatibility with RN's EventTarget.dispatchEvent.
 * Full dispatch compatibility is validated by the agentic recipe against the
 * live runtime; these unit tests verify constructor behavior and property access.
 */

/* eslint-disable @react-native/no-deep-imports, import-x/no-commonjs */
const RNCloseEvent =
  require('react-native/src/private/webapis/websockets/events/CloseEvent').default;
const RNMessageEvent =
  require('react-native/src/private/webapis/html/events/MessageEvent').default;
const RNEvent =
  require('react-native/src/private/webapis/dom/events/Event').default;
/* eslint-enable @react-native/no-deep-imports, import-x/no-commonjs */

describe('Event polyfill shims (TAT-3223)', () => {
  describe('CloseEvent', () => {
    it('preserves code, reason, and wasClean via getters', () => {
      const ce = new RNCloseEvent('close', {
        code: 1006,
        reason: 'abnormal',
        wasClean: false,
      });

      expect(ce.type).toBe('close');
      expect(ce.code).toBe(1006);
      expect(ce.reason).toBe('abnormal');
      expect(ce.wasClean).toBe(false);
    });

    it('defaults code to 0, reason to empty, wasClean to false', () => {
      const ce = new RNCloseEvent('close');

      expect(ce.code).toBe(0);
      expect(ce.reason).toBe('');
      expect(ce.wasClean).toBe(false);
    });

    it('extends RN Event', () => {
      const ce = new RNCloseEvent('close', { code: 1000 });

      expect(ce instanceof RNEvent).toBe(true);
      expect(ce.type).toBe('close');
    });
  });

  describe('MessageEvent', () => {
    it('preserves data and origin via getters', () => {
      const me = new RNMessageEvent('message', {
        data: 'payload',
        origin: 'wss://example.com',
      });

      expect(me.type).toBe('message');
      expect(me.data).toBe('payload');
      expect(me.origin).toBe('wss://example.com');
    });

    it('defaults data to undefined, origin to empty string', () => {
      const me = new RNMessageEvent('message');

      expect(me.data).toBeUndefined();
      expect(me.origin).toBe('');
    });

    it('extends RN Event', () => {
      const me = new RNMessageEvent('message', { data: 'test' });

      expect(me instanceof RNEvent).toBe(true);
    });
  });
});

describe('E2E network shim', () => {
  const MOCK_SERVER_URL = 'http://localhost:8000';
  const savedGlobals = {
    fetch: global.fetch,
    XMLHttpRequest: global.XMLHttpRequest,
    WebSocket: global.WebSocket,
  };

  /**
   * Evaluates shim.js in an isolated module registry, as an E2E build would.
   * Native-only side-effect imports are stubbed out.
   */
  const loadShim = () =>
    jest.isolateModules(() => {
      /* eslint-disable import-x/no-commonjs */
      jest.doMock('./app/util/test/utils.js', () => ({
        ...jest.requireActual('./app/util/test/utils.js'),
        isTestEnvironment: true,
        hasTestOverrides: true,
      }));
      jest.doMock('react-native-launch-arguments', () => ({
        LaunchArguments: { value: () => ({ mockServerPort: 8000 }) },
      }));
      jest.doMock('@walletconnect/react-native-compat', () => ({}));
      jest.doMock('expo', () => ({}));
      jest.doMock('compression-streams-polyfill', () => ({}));
      jest.doMock('./shimPerf', () => ({}));
      Object.defineProperty(require('react-native'), 'Settings', {
        value: { get: jest.fn() },
      });
      require('./shim.js');
      /* eslint-enable import-x/no-commonjs */
    });

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  let underlyingFetch;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    underlyingFetch = jest.fn(async (url) => {
      if (url === `${MOCK_SERVER_URL}/health-check`) {
        return { ok: true };
      }
      throw new TypeError('Network request failed');
    });
    global.fetch = underlyingFetch;
    global.XMLHttpRequest = undefined;
    global.WebSocket = undefined;
  });

  afterEach(() => {
    Object.assign(global, savedGlobals);
    jest.restoreAllMocks();
  });

  it('routes fetch through the mock server proxy', async () => {
    loadShim();
    await flushPromises();

    await global.fetch('https://example.com/a').catch(() => undefined);

    expect(underlyingFetch).toHaveBeenCalledWith(
      `${MOCK_SERVER_URL}/proxy?url=${encodeURIComponent('https://example.com/a')}`,
      undefined,
    );
  });

  it('does not proxy data URLs', async () => {
    underlyingFetch.mockImplementation(async (url) => {
      if (
        url === `${MOCK_SERVER_URL}/health-check` ||
        (typeof url === 'string' && url.startsWith('data:'))
      ) {
        return { ok: true };
      }
      throw new TypeError('Network request failed');
    });
    loadShim();
    await flushPromises();

    const dataUrl = 'data:application/octet-stream;base64,Zm9v';
    await global.fetch(dataUrl);

    expect(underlyingFetch).toHaveBeenCalledWith(dataUrl, undefined);
    expect(underlyingFetch).not.toHaveBeenCalledWith(
      `${MOCK_SERVER_URL}/proxy?url=${encodeURIComponent(dataUrl)}`,
      undefined,
    );
  });

  it('rejects when the proxied fetch fails, without retrying the original URL directly', async () => {
    loadShim();
    await flushPromises();

    await expect(global.fetch('https://example.com/a')).rejects.toThrow(
      'Network request failed',
    );
    expect(underlyingFetch).not.toHaveBeenCalledWith(
      'https://example.com/a',
      undefined,
    );
  });
});
