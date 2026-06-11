import {
  getAppiumHost,
  getAppiumPort,
  getAppiumServerUrl,
  isAppiumServerRunning,
  shouldSkipAppiumStop,
} from './AppiumServer.ts';

describe('AppiumServer', () => {
  const hostKey = 'APPIUM_HOST';
  const portKey = 'APPIUM_PORT';
  const skipStopKey = 'SKIP_APPIUM_STOP';

  let previousHost: string | undefined;
  let previousPort: string | undefined;
  let previousSkipStop: string | undefined;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    previousHost = process.env[hostKey];
    previousPort = process.env[portKey];
    previousSkipStop = process.env[skipStopKey];
    delete process.env[hostKey];
    delete process.env[portKey];
    delete process.env[skipStopKey];
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
    if (previousHost === undefined) {
      delete process.env[hostKey];
    } else {
      process.env[hostKey] = previousHost;
    }
    if (previousPort === undefined) {
      delete process.env[portKey];
    } else {
      process.env[portKey] = previousPort;
    }
    if (previousSkipStop === undefined) {
      delete process.env[skipStopKey];
    } else {
      process.env[skipStopKey] = previousSkipStop;
    }
  });

  describe('getAppiumHost', () => {
    it('defaults to 127.0.0.1', () => {
      expect(getAppiumHost()).toBe('127.0.0.1');
    });

    it('reads APPIUM_HOST', () => {
      process.env[hostKey] = 'localhost';
      expect(getAppiumHost()).toBe('localhost');
    });
  });

  describe('getAppiumPort', () => {
    it('defaults to 4723', () => {
      expect(getAppiumPort()).toBe(4723);
    });

    it('reads APPIUM_PORT', () => {
      process.env[portKey] = '4725';
      expect(getAppiumPort()).toBe(4725);
    });

    it('throws for invalid APPIUM_PORT', () => {
      process.env[portKey] = 'not-a-port';
      expect(() => getAppiumPort()).toThrow(/Invalid APPIUM_PORT/);
    });
  });

  describe('getAppiumServerUrl', () => {
    it('builds url from host and port env vars', () => {
      process.env[hostKey] = '127.0.0.1';
      process.env[portKey] = '4724';
      expect(getAppiumServerUrl()).toBe('http://127.0.0.1:4724');
    });
  });

  describe('shouldSkipAppiumStop', () => {
    it('returns false by default', () => {
      expect(shouldSkipAppiumStop()).toBe(false);
    });

    it('returns true when SKIP_APPIUM_STOP is true', () => {
      process.env[skipStopKey] = 'true';
      expect(shouldSkipAppiumStop()).toBe(true);
    });
  });

  describe('isAppiumServerRunning', () => {
    it('returns true when /status responds ok', async () => {
      fetchMock.mockResolvedValue({ ok: true } as Response);
      await expect(isAppiumServerRunning()).resolves.toBe(true);
      expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:4723/status');
    });

    it('returns false when /status is unreachable', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(isAppiumServerRunning()).resolves.toBe(false);
    });

    it('returns false when /status responds with non-ok', async () => {
      fetchMock.mockResolvedValue({ ok: false } as Response);
      await expect(isAppiumServerRunning()).resolves.toBe(false);
    });
  });
});
