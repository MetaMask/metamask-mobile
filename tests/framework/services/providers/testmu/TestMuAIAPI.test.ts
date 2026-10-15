jest.mock('../../../logger.ts', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import {
  TestMuAIAPI,
  TestMuAIAPIError,
  extractTestIdFromRecordingUrl,
  parseShareLinkResponse,
} from './TestMuAIAPI';

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

describe('extractTestIdFromRecordingUrl', () => {
  it('reads the test id from a TestMu recording URL', () => {
    expect(
      extractTestIdFromRecordingUrl(
        'https://prod-mobile-artefacts.lambdatest.com/30d/orgId-3245013/2026/10/13/RMAA-AND-3245013-1791894232540457522DYM/video/video.mp4?verify=abc',
      ),
    ).toBe('RMAA-AND-3245013-1791894232540457522DYM');
  });

  it('returns null for other URLs', () => {
    expect(
      extractTestIdFromRecordingUrl('https://video.test/a.mp4'),
    ).toBeNull();
  });
});

describe('parseShareLinkResponse', () => {
  const SHARE = 'https://appautomation.lambdatest.com/share/US_04OKP9PCU4L620';

  it('finds a full share URL anywhere in the response', () => {
    expect(parseShareLinkResponse({ data: { link: SHARE } })).toBe(SHARE);
    expect(parseShareLinkResponse({ data: [{ url: SHARE }] })).toBe(SHARE);
  });

  it('builds the URL from a bare US_ token', () => {
    expect(
      parseShareLinkResponse({ data: { token: 'US_04OKP9PCU4L620' } }),
    ).toBe(SHARE);
  });

  it('returns null when there is no link', () => {
    expect(parseShareLinkResponse({ status: 'ok' })).toBeNull();
    expect(parseShareLinkResponse(undefined)).toBeNull();
  });
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

describe('createShareLink', () => {
  const SHARE_URL = 'https://appautomation.lambdatest.com/share/US_ABC123';

  it('posts the test id and returns the share URL from the response', async () => {
    fetchMock.mockResolvedValue(response(200, { data: { url: SHARE_URL } }));

    const result = await new TestMuAIAPI().createShareLink('RMAA-AND-1-ABC');

    expect(result).toBe(SHARE_URL);
    expect(requestBody()).toEqual({
      entityIds: ['RMAA-AND-1-ABC'],
      entityType: 'App Automation Test',
      expiresAt: 30,
    });
  });

  it('throws a TestMuAIAPIError when the response is not ok', async () => {
    fetchMock.mockResolvedValue(response(403, { message: 'forbidden' }));

    const result = new TestMuAIAPI().createShareLink('RMAA-AND-1-ABC');

    await expect(result).rejects.toMatchObject({
      name: 'TestMuAIAPIError',
      status: 403,
    });
  });

  it('throws a TestMuAIAPIError when the body has no share link', async () => {
    fetchMock.mockResolvedValue(response(200, { status: 'ok' }));

    const result = new TestMuAIAPI().createShareLink('RMAA-AND-1-ABC');

    await expect(result).rejects.toBeInstanceOf(TestMuAIAPIError);
  });

  it.each(['LT_USERNAME', 'LT_ACCESS_KEY'])(
    'returns null without calling fetch when %s is missing',
    async (missingKey) => {
      Reflect.deleteProperty(env, missingKey);

      const result = await new TestMuAIAPI().createShareLink('RMAA-AND-1-ABC');

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
