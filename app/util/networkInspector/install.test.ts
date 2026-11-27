import { TurboModuleRegistry } from 'react-native';
import { installNetworkInspector } from './install';

jest.mock('../test/utils', () => ({ hasTestOverrides: false }));

interface IngestEvent {
  id: string;
  [field: string]: unknown;
}

const ingested: IngestEvent[] = [];

class FakeXhr {
  open = jest.fn();
  setRequestHeader = jest.fn();
  addEventListener = jest.fn();
  send(body: string) {
    ingested.push(...JSON.parse(body).events);
  }
}

const jsonResponse = {
  status: 200,
  statusText: 'OK',
  headers: {
    get: () => 'application/json',
    forEach: (cb: (value: string, name: string) => void) =>
      cb('application/json', 'content-type'),
  },
  clone: () => ({ text: async () => '{"ok":true}' }),
};

async function flushReporter() {
  await jest.advanceTimersByTimeAsync(250);
}

function eventsFor(url: string) {
  const start = ingested.find((event) => event.url === url);
  const id = start?.id;
  return {
    start,
    all: ingested.filter((event) => event.id === id),
  };
}

describe('installNetworkInspector', () => {
  const realFetch = jest.fn();
  const originalXhr = global.XMLHttpRequest;
  const originalFetch = global.fetch;

  const devFlag = globalThis as unknown as { __DEV__: boolean };
  const originalDev = devFlag.__DEV__;

  beforeEach(() => {
    devFlag.__DEV__ = true;
    jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue({
      getConstants: () => ({
        scriptURL: 'http://localhost:8081/index.bundle?platform=ios',
      }),
    });
    jest.useFakeTimers();
    ingested.length = 0;
    realFetch.mockReset();
    global.fetch = realFetch;
    global.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
    installNetworkInspector();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    devFlag.__DEV__ = originalDev;
    jest.useRealTimers();
    global.fetch = originalFetch;
    global.XMLHttpRequest = originalXhr;
  });

  it('returns the original response untouched and reports start and end with caller stack', async () => {
    realFetch.mockResolvedValue(jsonResponse);

    const response = await global.fetch('https://x.io/rpc', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
      body: '{"method":"eth_call"}',
    });
    await flushReporter();

    expect(response).toBe(jsonResponse);
    const { start, all } = eventsFor('https://x.io/rpc');
    expect(start).toMatchObject({
      kind: 'fetch',
      method: 'POST',
      reqBody: '{"method":"eth_call"}',
      reqHeaders: { Authorization: '[redacted]' },
      // Lets the dashboard tell devices apart.
      session: expect.any(String),
      platform: expect.any(String),
      osVersion: expect.any(String),
    });
    expect(String(start?.stack)).toContain('at ');
    expect(all).toContainEqual(
      expect.objectContaining({ status: 200, ttfbMs: expect.any(Number) }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({ resBody: '{"ok":true}', done: true }),
    );
  });

  it('rethrows the original failure and reports the error', async () => {
    const failure = new Error('offline');
    realFetch.mockRejectedValue(failure);

    await expect(global.fetch('https://x.io/down')).rejects.toBe(failure);
    await flushReporter();

    expect(eventsFor('https://x.io/down').all).toContainEqual(
      expect.objectContaining({ error: 'offline', done: true }),
    );
  });

  it('stays outermost when something replaces global.fetch later and reports once', async () => {
    realFetch.mockResolvedValue(jsonResponse);
    const installed = global.fetch;
    // Like shim.js: an async wrapper on top, forwarding to what was installed.
    global.fetch = (async (input: string, init?: RequestInit) => {
      await Promise.resolve();
      return installed(input, init);
    }) as unknown as typeof fetch;

    await jest.advanceTimersByTimeAsync(1100);
    await global.fetch('https://x.io/after-shim');
    await flushReporter();

    const starts = ingested.filter(
      (event) => event.url === 'https://x.io/after-shim',
    );
    expect(starts).toHaveLength(1);
    expect(String(starts[0].stack)).toContain('install.test');
  });

  it('never reports calls to the dev server itself', async () => {
    realFetch.mockResolvedValue(jsonResponse);

    await global.fetch('http://localhost:8081/symbolicate');
    await flushReporter();

    expect(ingested).toEqual([]);
  });
});
