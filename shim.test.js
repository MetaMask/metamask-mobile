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
  const HEALTH_CHECK_URL = `${MOCK_SERVER_URL}/health-check`;
  const proxied = (url) =>
    `${MOCK_SERVER_URL}/proxy?url=${encodeURIComponent(url)}`;
  const savedGlobals = {
    fetch: global.fetch,
    XMLHttpRequest: global.XMLHttpRequest,
    WebSocket: global.WebSocket,
  };

  let underlyingFetch;
  let answerHealthCheck;
  let nativeStart;
  // The patched expo/fetch NativeRequest of the last loadShim() call.
  let NativeRequest;

  /**
   * Evaluates shim.js in an isolated module registry, as an E2E build would.
   * Native-only side-effect imports are stubbed out.
   *
   * @param {object} [options]
   * @param {boolean} [options.hasTestOverrides] - Mocked `hasTestOverrides`.
   */
  const loadShim = ({ hasTestOverrides = true } = {}) =>
    jest.isolateModules(() => {
      /* eslint-disable import-x/no-commonjs */
      jest.doMock('./app/util/test/utils.js', () => ({
        ...jest.requireActual('./app/util/test/utils.js'),
        isTestEnvironment: true,
        hasTestOverrides,
      }));
      jest.doMock('react-native-launch-arguments', () => ({
        LaunchArguments: { value: () => ({ mockServerPort: 8000 }) },
      }));
      jest.doMock('@walletconnect/react-native-compat', () => ({}));
      jest.doMock('expo', () => ({}));
      jest.doMock('compression-streams-polyfill', () => ({}));
      jest.doMock('./shimPerf', () => ({}));
      jest.doMock('expo/src/winter/fetch/ExpoFetchModule', () => {
        class NativeRequest {}
        NativeRequest.prototype.start = nativeStart;
        return { ExpoFetchModule: { NativeRequest } };
      });
      jest.doMock('expo/src/winter/fetch/fetch', () => ({ fetch: jest.fn() }));
      jest.doMock('expo/src/winter/fetch/index', () => ({ fetch: jest.fn() }));
      Object.defineProperty(require('react-native'), 'Settings', {
        value: { get: jest.fn() },
      });
      require('./shim.js');
      ({ NativeRequest } =
        require('expo/src/winter/fetch/ExpoFetchModule').ExpoFetchModule);
      /* eslint-enable import-x/no-commonjs */
    });

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const healthCheck = new Promise((resolve) => {
      answerHealthCheck = resolve;
    });
    underlyingFetch = jest.fn(async (url) => {
      if (url === HEALTH_CHECK_URL) {
        return healthCheck;
      }
      throw new TypeError('Network request failed');
    });
    nativeStart = jest.fn(async () => undefined);
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
    answerHealthCheck({ ok: true });

    await global.fetch('https://example.com/a').catch(() => undefined);

    expect(underlyingFetch).toHaveBeenCalledWith(
      proxied('https://example.com/a'),
      undefined,
    );
  });

  it('rejects when the proxied fetch fails, without retrying the original URL directly', async () => {
    loadShim();
    answerHealthCheck({ ok: true });

    await expect(global.fetch('https://example.com/a')).rejects.toThrow(
      'Network request failed',
    );
    expect(underlyingFetch).not.toHaveBeenCalledWith(
      'https://example.com/a',
      undefined,
    );
  });

  it('routes a fetch issued before the health check settles through the mock server', async () => {
    loadShim();
    const pending = global.fetch('https://clients3.google.com/generate_204');
    await flushPromises();

    expect(underlyingFetch).toHaveBeenCalledTimes(1);
    expect(underlyingFetch).toHaveBeenCalledWith(HEALTH_CHECK_URL, {
      signal: expect.any(Object),
    });

    answerHealthCheck({ ok: true });
    await pending.catch(() => undefined);

    expect(underlyingFetch).toHaveBeenCalledWith(
      proxied('https://clients3.google.com/generate_204'),
      undefined,
    );
    expect(underlyingFetch).not.toHaveBeenCalledWith(
      'https://clients3.google.com/generate_204',
      undefined,
    );
  });

  it('sends fetch to the original URL when no mock server answers', async () => {
    loadShim();
    const pending = global.fetch('https://example.com/a');
    answerHealthCheck({ ok: false });
    await pending.catch(() => undefined);

    expect(underlyingFetch).toHaveBeenCalledWith(
      'https://example.com/a',
      undefined,
    );
  });

  it('re-installs the wrapper over a fetch that replaced it after the shim, without test overrides', async () => {
    loadShim({ hasTestOverrides: false });
    // NitroFetchSetup replaces global.fetch right after the shim.
    const nitroFetch = jest.fn(async () => ({ ok: true }));
    global.fetch = nitroFetch;

    answerHealthCheck({ ok: true });
    await flushPromises();
    await global.fetch('https://example.com/a');

    expect(global.fetch).not.toBe(nitroFetch);
    expect(nitroFetch).toHaveBeenCalledWith(
      proxied('https://example.com/a'),
      undefined,
    );
  });

  it('routes expo/fetch native requests started before the health check settles', async () => {
    loadShim();
    const request = new NativeRequest();

    const pending = request.start('https://example.com/stream', {}, null);
    await flushPromises();
    expect(nativeStart).not.toHaveBeenCalled();

    answerHealthCheck({ ok: true });
    await pending;

    expect(nativeStart).toHaveBeenCalledWith(
      proxied('https://example.com/stream'),
      {},
      null,
    );
  });

  it('starts expo/fetch native requests to the mock server itself without waiting', () => {
    loadShim();

    new NativeRequest().start(HEALTH_CHECK_URL, {}, null);

    expect(nativeStart).toHaveBeenCalledWith(HEALTH_CHECK_URL, {}, null);
  });
});
