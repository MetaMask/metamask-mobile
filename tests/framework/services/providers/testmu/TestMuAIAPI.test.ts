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
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  const response = (status: number, body: unknown = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body),
  });

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.LT_USERNAME = 'user';
    process.env.LT_ACCESS_KEY = 'key';
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

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
