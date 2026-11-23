import { installFoxy, headersToRecord } from './FoxyBridge';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  url: string;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
}

const makeResponse = () => ({
  status: 200,
  statusText: 'OK',
  ok: true,
  headers: {
    get: (name: string) => (name === 'content-length' ? '123' : null),
    forEach: (cb: (value: string, name: string) => void) => {
      cb('application/json', 'content-type');
      cb('session=abc', 'set-cookie');
    },
  },
});

describe('headersToRecord', () => {
  it('lower-cases names and redacts credential-bearing headers', () => {
    expect(
      headersToRecord({
        Authorization: 'Bearer abc',
        'X-Client': 'mobile',
        'x-auth-token': 'zzz',
        Cookie: 'a=b',
      }),
    ).toEqual({
      authorization: '[redacted]',
      'x-client': 'mobile',
      'x-auth-token': '[redacted]',
      cookie: '[redacted]',
    });
  });

  it('accepts [name, value] pairs and returns undefined when empty', () => {
    expect(headersToRecord([['Content-Type', 'application/json']])).toEqual({
      'content-type': 'application/json',
    });
    expect(headersToRecord(undefined)).toBeUndefined();
    expect(headersToRecord({})).toBeUndefined();
  });
});

describe('FoxyBridge', () => {
  const originalFetch = globalThis.fetch;
  const originalWebSocket = globalThis.WebSocket;
  const fakeFetch = jest.fn();

  beforeAll(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    fakeFetch.mockImplementation(async () => makeResponse());
    globalThis.fetch = fakeFetch as unknown as typeof fetch;
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    installFoxy('ws://localhost:8098/app');
  });

  afterAll(() => {
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    globalThis.WebSocket = originalWebSocket;
    jest.restoreAllMocks();
  });

  it('forwards the request unchanged and returns the original response', async () => {
    const response = await globalThis.fetch(
      'https://price.api.cx.metamask.io/v3/spot-prices?x=1',
      { method: 'post', headers: { Authorization: 'Bearer secret', 'x-client': 'mobile' } },
    );

    expect(response.status).toBe(200);
    expect(fakeFetch).toHaveBeenCalledWith(
      'https://price.api.cx.metamask.io/v3/spot-prices?x=1',
      { method: 'post', headers: { Authorization: 'Bearer secret', 'x-client': 'mobile' } },
    );
  });

  it('does not record Metro or dashboard traffic', async () => {
    await globalThis.fetch('http://localhost:8081/symbolicate');
    await globalThis.fetch('http://localhost:8098/api/status');
    await globalThis.fetch('https://tokens.api.cx.metamask.io/v3/assets');

    const ws = FakeWebSocket.instances[0];
    ws.open();
    const urls = ws.sent
      .filter((m) => m.type === 'request')
      .map((m) => m.url as string);

    expect(urls).not.toContain('http://localhost:8081/symbolicate');
    expect(urls).not.toContain('http://localhost:8098/api/status');
    expect(urls).toContain('https://tokens.api.cx.metamask.io/v3/assets');
  });

  it('buffers early requests and flushes them after `hello` once connected', () => {
    const ws = FakeWebSocket.instances[0];

    expect(ws.sent[0]).toMatchObject({ type: 'hello' });
    const first = ws.sent.find((m) => m.type === 'request');
    expect(first).toMatchObject({
      method: 'POST',
      transport: 'fetch',
      url: 'https://price.api.cx.metamask.io/v3/spot-prices?x=1',
    });
    expect(Array.isArray(first?.initiator)).toBe(true);
    expect(
      (first?.initiator as string[]).some((l) => l.includes('FoxyBridge')),
    ).toBe(false);
  });

  it('records request headers with credentials redacted', () => {
    const first = FakeWebSocket.instances[0].sent.find((m) => m.type === 'request');

    expect(first?.headers).toEqual({
      authorization: '[redacted]',
      'x-client': 'mobile',
    });
  });

  it('reports the response status, duration, size and redacted headers', () => {
    const ws = FakeWebSocket.instances[0];
    const response = ws.sent.find((m) => m.type === 'response');

    expect(response).toMatchObject({
      status: 200,
      statusText: 'OK',
      ok: true,
      sizeBytes: 123,
      headers: { 'content-type': 'application/json', 'set-cookie': '[redacted]' },
    });
    expect(typeof response?.durationMs).toBe('number');
  });

  it('does not capture bodies unless FOXY_BODIES=true', () => {
    const ws = FakeWebSocket.instances[0];

    expect(ws.sent.every((m) => m.bodyPreview === undefined)).toBe(true);
  });

  it('records a request once when an async wrapper (shim.js proxiedFetch) is installed on top', async () => {
    // Mimic shim.js: an async wrapper that awaits, then forwards to the previous global.fetch.
    const installedFetch = globalThis.fetch;
    const proxiedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      await Promise.resolve();
      return installedFetch(input, init);
    };
    globalThis.fetch = proxiedFetch as unknown as typeof fetch;
    jest.advanceTimersByTime(30); // the bridge re-wraps foreign fetches on an interval

    const ws = FakeWebSocket.instances[0];
    const before = ws.sent.filter(
      (m) => m.type === 'request' && m.url === 'https://dedupe.test/a',
    ).length;
    fakeFetch.mockClear();
    await globalThis.fetch('https://dedupe.test/a');
    const after = ws.sent.filter(
      (m) => m.type === 'request' && m.url === 'https://dedupe.test/a',
    ).length;

    expect(after - before).toBe(1);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });
});
