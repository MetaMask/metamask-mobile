import {
  getProxyForwardUrl,
  handleNormalizedHttpProxyRequest,
  type NormalizedHttpProxyRequest,
} from './MockServerE2E';
import { PlatformDetector } from '../framework/PlatformLocator';
import PortManager, { ResourceType } from '../framework/PortManager';
import type { MockEventsObject } from '../framework';

const headers = {};

const createRequest = (
  overrides: Partial<NormalizedHttpProxyRequest>,
): NormalizedHttpProxyRequest => ({
  source: 'device-proxy',
  targetUrl: 'https://live.example.invalid/path',
  method: 'GET',
  headers,
  ...overrides,
});

describe('handleNormalizedHttpProxyRequest', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    PortManager.resetInstance();
  });

  it('returns existing mock-table responses for direct device proxy traffic', async () => {
    const events: MockEventsObject = {
      GET: [
        {
          urlEndpoint: 'https://api.example.test/balance',
          responseCode: 200,
          response: { balance: '1' },
        },
      ],
    };
    const forwardRequest = jest.fn();
    const liveRequests: { url: string; method: string; timestamp: string }[] =
      [];

    const response = await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://api.example.test/balance',
      }),
      {
        events,
        liveRequests,
        forwardRequest,
        getForwardUrl: (url) => url,
      },
    );

    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ balance: '1' }),
    });
    expect(forwardRequest).not.toHaveBeenCalled();
    expect(liveRequests).toEqual([]);
  });

  it('passes through unmocked direct device proxy traffic without recording live-request failures', async () => {
    const forwardRequest = jest
      .fn()
      .mockResolvedValue({ statusCode: 204, body: '' });
    const liveRequests: { url: string; method: string; timestamp: string }[] =
      [];

    const response = await handleNormalizedHttpProxyRequest(createRequest({}), {
      events: {},
      liveRequests,
      forwardRequest,
      getForwardUrl: (url) => url,
    });

    expect(response).toEqual({ statusCode: 204, body: '' });
    expect(forwardRequest).toHaveBeenCalledWith(
      'https://live.example.invalid/path',
      'GET',
      headers,
      undefined,
    );
    expect(liveRequests).toEqual([]);
  });

  it('keeps recording unmocked shim proxy traffic as live requests', async () => {
    const forwardRequest = jest
      .fn()
      .mockResolvedValue({ statusCode: 204, body: '' });
    const liveRequests: { url: string; method: string; timestamp: string }[] =
      [];

    await handleNormalizedHttpProxyRequest(
      createRequest({
        source: 'shim-proxy',
      }),
      {
        events: {},
        liveRequests,
        forwardRequest,
        getForwardUrl: (url) => url,
      },
    );

    expect(liveRequests).toHaveLength(1);
    expect(liveRequests[0]).toMatchObject({
      url: 'https://live.example.invalid/path',
      method: 'GET',
    });
  });

  it('uses PlatformDetector for Android shim localhost forwarding', () => {
    jest.spyOn(PlatformDetector, 'getPlatform').mockReturnValue('android');

    const forwardUrl = getProxyForwardUrl(
      'http://localhost:12345/state.json',
      'shim-proxy',
    );

    expect(forwardUrl).toBe('http://127.0.0.1:12345/state.json');
    expect(PlatformDetector.getPlatform).toHaveBeenCalledTimes(1);
  });

  it.each(['localhost', '10.0.2.2', 'bs-local.com'])(
    'bridges Android direct fixture fallback traffic from %s to the host fixture server',
    (host) => {
      jest.spyOn(PlatformDetector, 'getPlatform').mockReturnValue('android');
      jest
        .spyOn(PortManager.getInstance(), 'getPort')
        .mockImplementation((resourceType) =>
          resourceType === ResourceType.FIXTURE_SERVER ? 45678 : undefined,
        );

      const forwardUrl = getProxyForwardUrl(
        `http://${host}:12345/state.json`,
        'device-proxy',
      );

      expect(forwardUrl).toBe('http://localhost:45678/state.json');
    },
  );
});
