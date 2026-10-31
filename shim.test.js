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
    AbortController: global.AbortController,
    fetch: global.fetch,
    XMLHttpRequest: global.XMLHttpRequest,
    WebSocket: global.WebSocket,
  };

  let underlyingFetch;
  let answerHealthCheck;
  let failHealthCheck;
  let nativeStart;
  let expoSourceFetch;
  let expoReExporterFetch;
  // The patched expo/fetch modules of the last loadShim() call.
  let NativeRequest;
  let expoFetchSource;
  let expoFetchReExporter;

  /**
   * Evaluates shim.js in an isolated module registry, as an E2E build would.
   * Native-only side-effect imports are stubbed out.
   *
   * @param {object} [options]
   * @param {boolean} [options.hasTestOverrides] - Mocked `hasTestOverrides`.
   * @param {boolean} [options.isPerformanceTest] - Mocked `isPerformanceTest`.
   * @param {boolean} [options.isTestEnvironment] - Mocked `isTestEnvironment`.
   * @param {object} [options.launchArguments] - Extra launch arguments.
   * @param {string} [options.platform] - `Platform.OS` the shim sees.
   */
  const loadShim = ({
    hasTestOverrides = true,
    isPerformanceTest = false,
    isTestEnvironment = true,
    launchArguments = {},
    platform = 'ios',
  } = {}) =>
    jest.isolateModules(() => {
      /* eslint-disable import-x/no-commonjs */
      jest.doMock('./app/util/test/utils.js', () => ({
        ...jest.requireActual('./app/util/test/utils.js'),
        isTestEnvironment,
        hasTestOverrides,
        isPerformanceTest,
      }));
      jest.doMock('react-native-launch-arguments', () => ({
        LaunchArguments: {
          value: () => ({ mockServerPort: 8000, ...launchArguments }),
        },
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
      jest.doMock('expo/src/winter/fetch/fetch', () => ({
        fetch: expoSourceFetch,
      }));
      jest.doMock('expo/src/winter/fetch/index', () => ({
        fetch: expoReExporterFetch,
      }));
      const ReactNative = require('react-native');
      Object.defineProperty(ReactNative, 'Settings', {
        value: { get: jest.fn() },
      });
      ReactNative.Platform.OS = platform;
      require('./shim.js');
      ({ NativeRequest } =
        require('expo/src/winter/fetch/ExpoFetchModule').ExpoFetchModule);
      expoFetchSource = require('expo/src/winter/fetch/fetch');
      expoFetchReExporter = require('expo/src/winter/fetch/index');
      /* eslint-enable import-x/no-commonjs */
    });

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const healthCheck = new Promise((resolve, reject) => {
      answerHealthCheck = resolve;
      failHealthCheck = reject;
    });
    underlyingFetch = jest.fn(async (url) => {
      if (url === HEALTH_CHECK_URL) {
        return healthCheck;
      }
      throw new TypeError('Network request failed');
    });
    nativeStart = jest.fn(async () => undefined);
    expoSourceFetch = jest.fn(async () => undefined);
    expoReExporterFetch = jest.fn(async () => undefined);
    global.fetch = underlyingFetch;
    global.XMLHttpRequest = undefined;
    global.WebSocket = undefined;
  });

  afterEach(() => {
    Object.assign(global, savedGlobals);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('fixture and command queue server ports', () => {
    const launchArguments = {
      fixtureServerPort: '30002',
      commandQueueServerPort: '30003',
    };
    let testConfig;

    beforeEach(() => {
      ({ testConfig } = jest.requireActual('./app/util/test/utils.js'));
      for (const key of Object.keys(testConfig)) {
        delete testConfig[key];
      }
    });

    it.each([
      ['a test environment', { isTestEnvironment: true }],
      [
        'a build with test overrides outside a test environment',
        { isTestEnvironment: false, hasTestOverrides: true },
      ],
    ])('reads them from launch arguments in %s', (_label, options) => {
      loadShim({ ...options, launchArguments });

      expect(testConfig.fixtureServerPort).toBe('30002');
      expect(testConfig.commandQueueServerPort).toBe('30003');
    });

    it('leaves them unset without a test environment or test overrides', () => {
      loadShim({
        isTestEnvironment: false,
        hasTestOverrides: false,
        launchArguments,
      });

      expect(testConfig.fixtureServerPort).toBeUndefined();
      expect(testConfig.commandQueueServerPort).toBeUndefined();
    });
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

  it('resolves data URLs in pure JS without calling the native fetch', async () => {
    loadShim();
    answerHealthCheck({ ok: true });
    await flushPromises();

    // base64-encoded "foo"
    const dataUrl = 'data:application/octet-stream;base64,Zm9v';
    const response = await global.fetch(dataUrl);

    // Must not reach the native fetch (which throws on Android) or the proxy.
    expect(underlyingFetch).not.toHaveBeenCalledWith(dataUrl, undefined);
    expect(underlyingFetch).not.toHaveBeenCalledWith(
      `${MOCK_SERVER_URL}/proxy?url=${encodeURIComponent(dataUrl)}`,
      undefined,
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('foo');
  });

  it('still routes unmatched WebSocket URLs through the mock proxy', async () => {
    const opened = [];
    global.WebSocket = function MockWebSocket(url, protocols) {
      opened.push({ url, protocols });
    };
    loadShim();
    answerHealthCheck({ ok: true });
    await flushPromises();

    const wsUrl = 'wss://example.com/socket';
    // eslint-disable-next-line no-new
    new global.WebSocket(wsUrl);

    expect(opened).toEqual([
      {
        url: `ws://localhost:8000/proxy-ws?url=${encodeURIComponent(wsUrl)}`,
        protocols: undefined,
      },
    ]);
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
      signal: expect.any(global.AbortSignal),
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

  it('sends a fetch held for the health check to the original URL once the check times out after 5 s', async () => {
    jest.useFakeTimers();
    // A timeout signal on the fake clock, standing in for the platform's.
    const timeout = jest
      .spyOn(global.AbortSignal, 'timeout')
      .mockImplementation((ms) => {
        const controller = new savedGlobals.AbortController();
        setTimeout(() => controller.abort(new Error('timed out')), ms);
        return controller.signal;
      });
    // A mock server that never answers: only the signal ends the request.
    underlyingFetch.mockImplementation((url, options) =>
      url === HEALTH_CHECK_URL
        ? new Promise((_, reject) => {
            options.signal.addEventListener('abort', () =>
              reject(options.signal.reason),
            );
          })
        : Promise.resolve({ ok: true }),
    );
    loadShim();

    expect(timeout).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(underlyingFetch).toHaveBeenCalledWith(HEALTH_CHECK_URL, {
      signal: timeout.mock.results[0].value,
    });

    const pending = global.fetch('https://example.com/a');
    await jest.advanceTimersByTimeAsync(4999);
    expect(underlyingFetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    await pending;
    expect(underlyingFetch).toHaveBeenCalledTimes(2);
    expect(underlyingFetch).toHaveBeenLastCalledWith(
      'https://example.com/a',
      undefined,
    );
  });

  it('sends fetch to the original URL when the health check is refused', async () => {
    loadShim();
    const pending = global.fetch('https://example.com/a');
    failHealthCheck(new TypeError('Network request failed'));
    await pending.catch(() => undefined);

    expect(underlyingFetch).toHaveBeenCalledWith(
      'https://example.com/a',
      undefined,
    );
    expect(underlyingFetch).not.toHaveBeenCalledWith(
      proxied('https://example.com/a'),
      undefined,
    );
  });

  it('falls back to the Android emulator host when localhost does not answer', async () => {
    const emulatorUrl = 'http://10.0.2.2:8000';
    underlyingFetch.mockImplementation(async (url) => {
      if (url === HEALTH_CHECK_URL) {
        throw new TypeError('Network request failed');
      }
      if (url === `${emulatorUrl}/health-check`) {
        return { ok: true };
      }
      return { ok: true, url };
    });
    loadShim({ platform: 'android' });

    await global.fetch('https://clients3.google.com/generate_204');

    expect(underlyingFetch.mock.calls.map(([url]) => url)).toEqual([
      HEALTH_CHECK_URL,
      `${emulatorUrl}/health-check`,
      `${emulatorUrl}/proxy?url=${encodeURIComponent(
        'https://clients3.google.com/generate_204',
      )}`,
    ]);
  });

  it('does not re-install the wrapper over a later wrapper of it, with test overrides', async () => {
    loadShim({ hasTestOverrides: true });
    // A later fetch wrapper (e.g. a debug request tracker) calling the shim's.
    // Re-installing the shim's wrapper on top of it would make them call each
    // other forever; fail on re-entry instead.
    const shimFetch = global.fetch;
    const trackingFetch = jest.fn((url, options) => {
      if (trackingFetch.mock.calls.length > 1) {
        throw new Error('fetch recursed');
      }
      return shimFetch(url, options);
    });
    global.fetch = trackingFetch;

    answerHealthCheck({ ok: true });
    await flushPromises();
    await global.fetch('https://example.com/a').catch(() => undefined);

    expect(global.fetch).toBe(trackingFetch);
    expect(trackingFetch).toHaveBeenCalledTimes(1);
    expect(underlyingFetch.mock.calls).toEqual([
      [HEALTH_CHECK_URL, { signal: expect.any(global.AbortSignal) }],
      [proxied('https://example.com/a'), undefined],
    ]);
  });

  describe.each([
    ['source module', () => expoFetchSource, () => expoSourceFetch],
    ['re-exporter', () => expoFetchReExporter, () => expoReExporterFetch],
  ])('expo/fetch %s', (_label, getModule, getOriginalFetch) => {
    it('holds a fetch until the health check settles, then routes it through the mock server', async () => {
      loadShim();
      const pending = getModule().fetch('https://example.com/stream', {});
      await flushPromises();
      expect(getOriginalFetch()).not.toHaveBeenCalled();

      answerHealthCheck({ ok: true });
      await pending;

      expect(getOriginalFetch()).toHaveBeenCalledTimes(1);
      expect(getOriginalFetch()).toHaveBeenCalledWith(
        proxied('https://example.com/stream'),
        {},
      );
    });

    it('sends a fetch to the original URL when no mock server answers', async () => {
      loadShim();
      const pending = getModule().fetch('https://example.com/stream', {});
      answerHealthCheck({ ok: false });
      await pending;

      expect(getOriginalFetch()).toHaveBeenCalledWith(
        'https://example.com/stream',
        {},
      );
    });
  });

  describe('performance builds', () => {
    const web3AuthUrl = 'https://sapphire-1.node.web3auth.io/sss/v1';

    it('sends fetch to web3auth nodes directly, and other hosts through the mock server', async () => {
      loadShim({ isPerformanceTest: true });
      answerHealthCheck({ ok: true });

      await global.fetch(web3AuthUrl).catch(() => undefined);
      await global.fetch('https://example.com/a').catch(() => undefined);

      expect(underlyingFetch).toHaveBeenCalledWith(web3AuthUrl, undefined);
      expect(underlyingFetch).not.toHaveBeenCalledWith(
        proxied(web3AuthUrl),
        undefined,
      );
      expect(underlyingFetch).toHaveBeenCalledWith(
        proxied('https://example.com/a'),
        undefined,
      );
    });

    it('starts expo/fetch native requests to web3auth nodes directly', async () => {
      loadShim({ isPerformanceTest: true });
      answerHealthCheck({ ok: true });

      await new NativeRequest().start(web3AuthUrl, {}, null);

      expect(nativeStart).toHaveBeenCalledWith(web3AuthUrl, {}, null);
    });
  });

  it('starts expo/fetch native requests at the original URL when no mock server answers', async () => {
    loadShim();
    const pending = new NativeRequest().start(
      'https://example.com/stream',
      {},
      null,
    );
    answerHealthCheck({ ok: false });
    await pending;

    expect(nativeStart).toHaveBeenCalledWith(
      'https://example.com/stream',
      {},
      null,
    );
  });

  it.each(['data:text/plain;base64,aGk=', 'file:///tmp/a.json'])(
    'does not proxy expo/fetch native requests to %s',
    async (url) => {
      loadShim();
      answerHealthCheck({ ok: true });

      await new NativeRequest().start(url, {}, null);

      expect(nativeStart).toHaveBeenCalledWith(url, {}, null);
    },
  );
});
