jest.mock('../../../logger.ts', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import { TestMuAIAPI, TestMuAIAPIError } from './TestMuAIAPI';

const env = process.env;
const fetchMock = jest.fn();
const originalFetch = global.fetch;
const originalCredentials = {
  username: env.LT_USERNAME,
  accessKey: env.LT_ACCESS_KEY,
};

const response = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 404 ? 'Not Found' : 'OK',
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const requestBody = (): Record<string, unknown> =>
  JSON.parse(fetchMock.mock.calls[0][1].body);

const restoreEnvVar = (key: string, value: string | undefined) => {
  if (value === undefined) {
    Reflect.deleteProperty(env, key);
  } else {
    env[key] = value;
  }
};

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  env.LT_USERNAME = 'user';
  env.LT_ACCESS_KEY = 'key';
});

afterEach(() => {
  restoreEnvVar('LT_USERNAME', originalCredentials.username);
  restoreEnvVar('LT_ACCESS_KEY', originalCredentials.accessKey);
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('session log retries', () => {
  it.each([
    ['getNetworkLogs', 'network'],
    ['getAppMetrics', 'appmetrics'],
  ] as const)(
    '%s retries 404s until the log is processed',
    async (method, log) => {
      fetchMock
        .mockResolvedValueOnce(response(404))
        .mockResolvedValueOnce(response(404))
        .mockResolvedValueOnce(response(200, { ok: true }));

      const result = await new TestMuAIAPI()[method]('sess-1', 5, 0);

      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[0][0]).toContain(
        `/sessions/sess-1/log/${log}`,
      );
    },
  );

  it('throws once retries are exhausted', async () => {
    fetchMock.mockResolvedValue(response(404, { message: 'missing' }));

    await expect(
      new TestMuAIAPI().getNetworkLogs('sess-1', 3, 0),
    ).rejects.toBeInstanceOf(TestMuAIAPIError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry other errors', async () => {
    fetchMock.mockResolvedValue(response(500));

    await expect(
      new TestMuAIAPI().getAppMetrics('sess-1', 5, 0),
    ).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('updateSession', () => {
  it('sends a PATCH to the session endpoint with basic auth', async () => {
    fetchMock.mockResolvedValue(response(200));

    await new TestMuAIAPI().updateSession('sess-1', { name: 'Login' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/sessions/sess-1');
    expect(init.method).toBe('PATCH');
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from('user:key').toString('base64')}`,
    );
  });

  it.each([
    ['passed', 'passed'],
    ['failed', 'failed'],
    ['timedOut', 'failed'],
    ['interrupted', 'failed'],
  ])('maps the %s status to status_ind %s', async (status, expected) => {
    fetchMock.mockResolvedValue(response(200));

    await new TestMuAIAPI().updateSession('sess-1', { status });

    expect(requestBody().status_ind).toBe(expected);
  });

  it('defaults an unknown status to failed', async () => {
    fetchMock.mockResolvedValue(response(200));

    await new TestMuAIAPI().updateSession('sess-1', { status: 'exploded' });

    expect(requestBody().status_ind).toBe('failed');
  });

  it('leaves status_ind out when a skipped status comes with a name', async () => {
    fetchMock.mockResolvedValue(response(200));

    await new TestMuAIAPI().updateSession('sess-1', {
      status: 'skipped',
      name: 'Login',
    });

    expect(requestBody()).toEqual({ name: 'Login' });
  });

  it('returns null without calling fetch when the payload is only a skipped status', async () => {
    const result = await new TestMuAIAPI().updateSession('sess-1', {
      status: 'skipped',
    });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['LT_USERNAME', 'LT_ACCESS_KEY'])(
    'returns null without calling fetch when %s is missing',
    async (missingKey) => {
      Reflect.deleteProperty(env, missingKey);

      const result = await new TestMuAIAPI().updateSession('sess-1', {
        name: 'Login',
      });

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('throws a TestMuAIAPIError with the HTTP status when the update is rejected', async () => {
    fetchMock.mockResolvedValue(response(404, { message: 'gone' }));

    const result = new TestMuAIAPI().updateSession('sess-1', { name: 'Login' });

    await expect(result).rejects.toMatchObject({
      name: 'TestMuAIAPIError',
      status: 404,
    });
  });
});
