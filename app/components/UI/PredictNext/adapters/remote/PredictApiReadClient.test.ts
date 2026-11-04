import Logger from '../../../../../util/Logger';
import type {
  PredictEntityId,
  PredictFeedId,
  PredictMarketHistoryRange,
  PredictVenueId,
} from '../../types';
import { TemplateError } from '../../auth/signing/venueTemplates';
import { PredictApiReadClient, PredictHttpError } from './PredictApiReadClient';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const mockLoggerError = jest.mocked(Logger.error);

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'event/one' as PredictEntityId;
const feedId = 'sports-football-nfl-games' as PredictFeedId;
const marketId = 'market/one' as PredictEntityId;
const range: PredictMarketHistoryRange = 'LIVE';

const createResponse = ({
  status = 200,
  json = { ok: true },
}: {
  status?: number;
  json?: unknown;
} = {}): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(json),
  }) as unknown as Response;

describe('PredictApiReadClient', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let client: PredictApiReadClient;

  beforeEach(() => {
    mockLoggerError.mockClear();
    fetchMock = jest.fn();
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
      signOperation: async () => ({
        name: 'Venue-Authorization',
        value: 'envelope',
      }),
    });
  });

  it('fails before HTTP when the API URL is not configured', async () => {
    client = new PredictApiReadClient({
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
    });

    await expect(client.fetchVenueStatus(venueId)).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails before HTTP when the API URL is malformed', async () => {
    client = new PredictApiReadClient({
      baseUrl: 'not a URL',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
    });

    await expect(client.fetchVenueStatus(venueId)).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('authenticates Venue Status requests without a content type header', async () => {
    const getBearerToken = jest.fn().mockResolvedValue('secret-token');
    fetchMock.mockResolvedValue(createResponse());
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken,
    });

    await client.fetchVenueStatus(venueId);

    expect(getBearerToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/status',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-metamask-clientproduct': 'metamask-mobile',
          'x-metamask-clientversion': '7.0.0',
          Authorization: 'Bearer secret-token',
        },
        signal: undefined,
      },
    );
  });

  it('authenticates Balance requests without retaining identity in the URL', async () => {
    fetchMock.mockResolvedValue(createResponse());
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
      signOperation: async () => ({
        name: 'Venue-Authorization',
        value: 'envelope',
      }),
    });

    await client.fetchBalance(venueId);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/balance',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token',
        }),
      }),
    );
  });

  it('fails requests before HTTP when no bearer token is available', async () => {
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => undefined,
    });

    await expect(client.fetchBalance(venueId)).rejects.toMatchObject({
      status: 401,
    });
    await expect(client.fetchFeed(venueId, feedId, {})).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails requests before HTTP when the token provider rejects, without leaking its error', async () => {
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => {
        throw new Error('wallet is locked');
      },
    });

    await expect(client.fetchEvent(venueId, eventId)).rejects.toMatchObject({
      status: 401,
      message: 'Predict API request failed with status 401.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs the token provider failure before failing with 401', async () => {
    const providerError = new Error('wallet is locked');
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: jest.fn().mockRejectedValue(providerError),
    });

    await expect(client.fetchBalance(venueId)).rejects.toMatchObject({
      status: 401,
    });

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      providerError,
      'PredictNext: failed to get the Predict API bearer token',
    );
  });

  it('authenticates Positions requests with encoded page parameters', async () => {
    fetchMock.mockResolvedValue(createResponse());

    await client.fetchPositions(venueId, { cursor: 'next page', limit: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/positions?cursor=next+page&limit=20',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token',
        }),
      }),
    );
  });

  it('sends the Positions status filter as a comma-separated list', async () => {
    fetchMock.mockResolvedValue(createResponse());

    await client.fetchPositions(venueId, {
      limit: 3,
      status: ['open', 'claimable'],
      sort: 'value',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/positions?limit=3&sort=value&status=open%2Cclaimable',
      expect.anything(),
    );
  });

  it('authenticates Portfolio Summary requests', async () => {
    fetchMock.mockResolvedValue(createResponse());

    await client.fetchPortfolioSummary(venueId);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/portfolio/summary',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token',
        }),
      }),
    );
  });

  it('follows a Positions continuation until the page is present', async () => {
    const signOperation = jest.fn().mockResolvedValue({
      name: 'Venue-Authorization',
      value: 'envelope',
    });
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
      signOperation,
    });
    fetchMock
      .mockResolvedValueOnce(
        createResponse({
          json: {
            venueId: 'kalshi',
            continuation: {
              token: 'step-2',
              step: 'settlements',
              values: { tickers: ['KXTEST'] },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          json: { venueId: 'kalshi', positions: [] },
        }),
      );

    await expect(
      client.fetchPositions(venueId, { limit: 20 }),
    ).resolves.toEqual({
      venueId: 'kalshi',
      positions: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://predict.example/api/v1/venues/kalshi/positions?limit=20',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://predict.example/api/v1/venues/kalshi/positions?limit=20',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ continuation: 'step-2' }),
      }),
    );
    expect(String(fetchMock.mock.calls[1][0])).not.toContain('continuation');
    expect(signOperation).toHaveBeenNthCalledWith(2, 'portfolio.positions', {
      step: 'settlements',
      values: { tickers: ['KXTEST'] },
    });
  });

  it('signs the next Activity page with the values the previous page returned', async () => {
    const signOperation = jest.fn().mockResolvedValue({
      name: 'Venue-Authorization',
      value: 'envelope',
    });
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
      signOperation,
    });
    fetchMock
      .mockResolvedValueOnce(
        createResponse({
          json: {
            venueId: 'kalshi',
            activity: [],
            nextCursor: 'page-2',
            continuation: {
              token: 'unused',
              step: 'settlements',
              values: { max_ts: 1700000000 },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          json: { venueId: 'kalshi', activity: [] },
        }),
      );

    await client.fetchActivity(venueId, { limit: 20 });
    await client.fetchActivity(venueId, { limit: 20, cursor: 'page-2' });

    expect(signOperation).toHaveBeenLastCalledWith('portfolio.activity', {
      step: 'settlements',
      values: { max_ts: 1700000000 },
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://predict.example/api/v1/venues/kalshi/activity?limit=20&cursor=page-2',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(
      (fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body,
    ).toBeUndefined();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).not.toContain(
      'continuation',
    );
  });

  describe('paged signed reads', () => {
    const stepChanged = () => {
      const moved = {
        code: 'venue_step_changed',
        next: { step: 'settlements', values: { max_ts: 1700000000 } },
      };
      const response = createResponse({ status: 409, json: moved });
      (response as unknown as { clone: () => Response }).clone = () =>
        createResponse({ status: 409, json: moved });
      return response;
    };
    const invalidRequest = () => {
      const rejected = { code: 'invalid_request' };
      const response = createResponse({ status: 400, json: rejected });
      (response as unknown as { clone: () => Response }).clone = () =>
        createResponse({ status: 400, json: rejected });
      return response;
    };
    const partialPositions = () =>
      createResponse({
        json: {
          venueId: 'kalshi',
          continuation: {
            token: 'step-2',
            step: 'holdings',
            values: { tickers: ['KXTEST'] },
          },
        },
      });
    const finishedPage = (nextCursor?: string) =>
      createResponse({
        json: {
          venueId: 'kalshi',
          activity: [],
          ...(nextCursor
            ? {
                nextCursor,
                continuation: {
                  token: 'unused',
                  step: 'archive',
                  values: { cursor: nextCursor },
                },
              }
            : {}),
        },
      });
    let signOperation: jest.Mock;

    beforeEach(() => {
      signOperation = jest.fn().mockResolvedValue({
        name: 'Venue-Authorization',
        value: 'envelope',
      });
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation,
      });
    });

    it('posts the same continuation token when the venue step changes', async () => {
      fetchMock
        .mockResolvedValueOnce(partialPositions())
        .mockResolvedValueOnce(stepChanged())
        .mockResolvedValueOnce(
          createResponse({ json: { venueId: 'kalshi', positions: [] } }),
        );

      await client.fetchPositions(venueId, {
        limit: 3,
        cursor: 'next page',
        status: ['open', 'claimable'],
        sort: 'value',
      });

      const pageUrl =
        'https://predict.example/api/v1/venues/kalshi/positions?limit=3&cursor=next+page&sort=value&status=open%2Cclaimable';
      const continuationBody = JSON.stringify({ continuation: 'step-2' });
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        pageUrl,
        expect.objectContaining({ method: 'POST', body: continuationBody }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        pageUrl,
        expect.objectContaining({ method: 'POST', body: continuationBody }),
      );
      expect(String(fetchMock.mock.calls[1][0])).not.toContain('continuation');
      expect(signOperation).toHaveBeenNthCalledWith(3, 'portfolio.positions', {
        step: 'settlements',
        values: { max_ts: 1700000000 },
      });
    });

    it('drops a rejected continuation token and starts the read again as a GET', async () => {
      fetchMock
        .mockResolvedValueOnce(
          createResponse({
            json: {
              venueId: 'kalshi',
              activity: [],
              nextCursor: 'page-2',
              continuation: {
                token: 'page-token',
                step: 'settlements',
                values: { max_ts: 1700000000 },
              },
            },
          }),
        )
        .mockResolvedValueOnce(
          createResponse({
            json: {
              venueId: 'kalshi',
              continuation: {
                token: 'step-2',
                step: 'holdings',
                values: { tickers: ['KXTEST'] },
              },
            },
          }),
        )
        .mockResolvedValueOnce(invalidRequest())
        .mockResolvedValueOnce(
          createResponse({ json: { venueId: 'kalshi', activity: [] } }),
        );

      await client.fetchActivity(venueId, { limit: 20 });
      await expect(
        client.fetchActivity(venueId, { limit: 20, cursor: 'page-2' }),
      ).resolves.toEqual({ venueId: 'kalshi', activity: [] });

      const pageUrl =
        'https://predict.example/api/v1/venues/kalshi/activity?limit=20&cursor=page-2';
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        pageUrl,
        expect.objectContaining({ method: 'GET' }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        pageUrl,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ continuation: 'step-2' }),
        }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        4,
        pageUrl,
        expect.objectContaining({ method: 'GET' }),
      );
      expect((fetchMock.mock.calls[3][1] as RequestInit).body).toBeUndefined();
      expect(String(fetchMock.mock.calls[3][0])).not.toContain('step-2');
      expect(signOperation.mock.calls.map((call) => call[1])).toEqual([
        { step: undefined, values: undefined },
        { step: 'settlements', values: { max_ts: 1700000000 } },
        { step: 'holdings', values: { tickers: ['KXTEST'] } },
        { step: 'settlements', values: { max_ts: 1700000000 } },
      ]);
    });

    it('surfaces the error when the restarted read fails', async () => {
      const failedRestart = createResponse({ status: 503, json: {} });
      (failedRestart as unknown as { clone: () => Response }).clone = () =>
        createResponse({ status: 503, json: {} });
      fetchMock
        .mockResolvedValueOnce(partialPositions())
        .mockResolvedValueOnce(invalidRequest())
        .mockResolvedValueOnce(failedRestart);

      await expect(
        client.fetchPositions(venueId, { limit: 20 }),
      ).rejects.toMatchObject({ status: 503 });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect((fetchMock.mock.calls[2][1] as RequestInit).method).toBe('GET');
      expect((fetchMock.mock.calls[2][1] as RequestInit).body).toBeUndefined();
    });

    it('surfaces invalid_request on the first GET', async () => {
      fetchMock.mockResolvedValueOnce(invalidRequest());

      await expect(
        client.fetchPositions(venueId, { limit: 20 }),
      ).rejects.toMatchObject({
        status: 400,
        bodyCode: 'invalid_request',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('re-renders a moved step once, then surfaces the second move', async () => {
      fetchMock
        .mockResolvedValueOnce(stepChanged())
        .mockResolvedValueOnce(stepChanged())
        .mockResolvedValueOnce(finishedPage());

      await expect(
        client.fetchActivity(venueId, { limit: 20 }),
      ).rejects.toMatchObject({ status: 409, bodyCode: 'venue_step_changed' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(signOperation).toHaveBeenNthCalledWith(2, 'portfolio.activity', {
        step: 'settlements',
        values: { max_ts: 1700000000 },
      });
    });

    it('stops following continuations at the signed call cap', async () => {
      fetchMock.mockImplementation(async () =>
        createResponse({
          json: {
            venueId: 'kalshi',
            continuation: {
              token: 'again',
              step: 'settlements',
              values: { tickers: [] },
            },
          },
        }),
      );

      await expect(
        client.fetchPositions(venueId, { limit: 20 }),
      ).rejects.toMatchObject({ status: 503 });
      expect(fetchMock).toHaveBeenCalledTimes(25);
      expect(fetchMock.mock.calls[1][0]).toBe(
        'https://predict.example/api/v1/venues/kalshi/positions?limit=20',
      );
      expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST');
      expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(
        JSON.stringify({ continuation: 'again' }),
      );
    });

    it('keys remembered next-page values by operation, not by cursor alone', async () => {
      fetchMock
        .mockResolvedValueOnce(finishedPage('page-2'))
        .mockResolvedValue(
          createResponse({ json: { venueId: 'kalshi', positions: [] } }),
        );

      await client.fetchActivity(venueId, { limit: 20 });
      await client.fetchPositions(venueId, { limit: 20, cursor: 'page-2' });

      expect(signOperation).toHaveBeenLastCalledWith('portfolio.positions', {
        step: undefined,
        values: undefined,
      });
    });

    it('forgets remembered next-page values on clearAccountState', async () => {
      fetchMock
        .mockResolvedValueOnce(finishedPage('page-2'))
        .mockResolvedValue(finishedPage());

      await client.fetchActivity(venueId, { limit: 20 });
      client.clearAccountState();
      await client.fetchActivity(venueId, { limit: 20, cursor: 'page-2' });

      expect(signOperation).toHaveBeenLastCalledWith('portfolio.activity', {
        step: undefined,
        values: undefined,
      });
    });
  });

  it('authenticates Activity requests with encoded page parameters', async () => {
    fetchMock.mockResolvedValue(createResponse());

    await client.fetchActivity(venueId, { limit: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/activity?limit=20',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token',
        }),
      }),
    );
  });

  it('encodes event-list query parameters', async () => {
    fetchMock.mockResolvedValue(createResponse());

    await client.fetchFeed(venueId, feedId, { cursor: 'next page', limit: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/feeds/sports-football-nfl-games?cursor=next+page&limit=20',
      expect.any(Object),
    );
  });

  it('encodes an Event ID as one path segment', async () => {
    fetchMock.mockResolvedValue(createResponse());

    await client.fetchEvent(venueId, eventId);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/events/event%2Fone',
      expect.any(Object),
    );
  });

  it('requests encoded Market history with the exact range query', async () => {
    fetchMock.mockResolvedValue(createResponse());

    await client.fetchMarketHistory(venueId, marketId, range);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/markets/market%2Fone/history?range=LIVE',
      expect.any(Object),
    );
  });

  it('requests search with the encoded query and limit', async () => {
    fetchMock.mockResolvedValue(createResponse());

    await client.searchEvents(venueId, { q: 'chiefs bills', limit: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/search?q=chiefs+bills&limit=20',
      expect.any(Object),
    );
  });

  it('forwards an AbortSignal for Market history', async () => {
    fetchMock.mockResolvedValue(createResponse());
    const signal = new AbortController().signal;

    await client.fetchMarketHistory(venueId, marketId, range, { signal });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal }),
    );
  });

  it('forwards an AbortSignal', async () => {
    fetchMock.mockResolvedValue(createResponse());
    const signal = new AbortController().signal;

    await client.fetchFeed(venueId, feedId, {}, { signal });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal }),
    );
  });

  it('throws a status-only error for non-2xx responses', async () => {
    fetchMock.mockResolvedValue(
      createResponse({ status: 429, json: { secret: 'discard' } }),
    );

    await expect(client.fetchFeed(venueId, feedId, {})).rejects.toEqual(
      expect.objectContaining({ status: 429 }),
    );
  });

  it('throws a status-only error when a success body is not JSON', async () => {
    const response = createResponse();
    jest.mocked(response.json).mockRejectedValue(new SyntaxError('payload'));
    fetchMock.mockResolvedValue(response);

    await expect(client.fetchFeed(venueId, feedId, {})).rejects.toEqual(
      expect.objectContaining({ status: 200 }),
    );
  });

  it('preserves AbortError from response parsing', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    const response = createResponse();
    jest.mocked(response.json).mockRejectedValue(abortError);
    fetchMock.mockResolvedValue(response);

    await expect(client.fetchFeed(venueId, feedId, {})).rejects.toBe(
      abortError,
    );
  });

  it('performs one request when a request fails', async () => {
    fetchMock.mockResolvedValue(createResponse({ status: 503 }));

    await expect(client.fetchFeed(venueId, feedId, {})).rejects.toBeInstanceOf(
      PredictHttpError,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  describe('device-signed Balance', () => {
    const header = { name: 'Venue-Authorization', value: 'envelope' };
    /** A response whose `clone()` yields the same status and error code. */
    const errorResponse = (status: number, code: string): Response => {
      const response = createResponse({ status, json: { code } });
      (response as unknown as { clone: () => Response }).clone = () =>
        createResponse({ status, json: { code } });
      return response;
    };

    let signOperation: jest.Mock;
    let invalidateSigningSession: jest.Mock;

    beforeEach(() => {
      signOperation = jest.fn().mockResolvedValue(header);
      invalidateSigningSession = jest.fn();
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation,
        invalidateSigningSession,
      });
    });

    it('signs the balance operation and sends it as the first and only call', async () => {
      fetchMock.mockResolvedValueOnce(
        createResponse({ json: { available: '1.0000' } }),
      );

      await expect(client.fetchBalance(venueId)).resolves.toEqual({
        available: '1.0000',
      });

      expect(signOperation).toHaveBeenCalledTimes(1);
      expect(signOperation).toHaveBeenCalledWith(
        'portfolio.balance',
        undefined,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const headers = (fetchMock.mock.calls[0][1] as RequestInit)
        .headers as Record<string, string>;
      expect(headers['Venue-Authorization']).toBe('envelope');
      expect(headers.Authorization).toBe('Bearer secret-token');
    });

    it('does not send a call the profile refused', async () => {
      signOperation.mockRejectedValue(new TemplateError('operation'));

      await expect(client.fetchBalance(venueId)).rejects.toMatchObject({
        status: 400,
        bodyCode: 'venue_signing_refused_operation',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not send a call when signing is unavailable', async () => {
      signOperation.mockResolvedValue(undefined);

      await expect(client.fetchBalance(venueId)).rejects.toMatchObject({
        status: 400,
        bodyCode: 'venue_signing_unavailable',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not send a call when the client has no signer', async () => {
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
      });

      await expect(client.fetchBalance(venueId)).rejects.toMatchObject({
        bodyCode: 'venue_signing_unavailable',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('drops the A2T and signs again once on venue_authorization_invalid', async () => {
      fetchMock
        .mockResolvedValueOnce(
          errorResponse(403, 'venue_authorization_invalid'),
        )
        .mockResolvedValueOnce(createResponse({ json: { available: '2' } }));

      await expect(client.fetchBalance(venueId)).resolves.toEqual({
        available: '2',
      });
      expect(invalidateSigningSession).toHaveBeenCalledTimes(1);
      expect(signOperation).toHaveBeenCalledTimes(2);
    });

    it('signs again once, keeping the A2T, on venue_signature_expired', async () => {
      fetchMock
        .mockResolvedValueOnce(errorResponse(409, 'venue_signature_expired'))
        .mockResolvedValueOnce(createResponse({ json: { available: '2' } }));

      await expect(client.fetchBalance(venueId)).resolves.toEqual({
        available: '2',
      });
      expect(invalidateSigningSession).not.toHaveBeenCalled();
      expect(signOperation).toHaveBeenCalledTimes(2);
    });

    it('surfaces the backend code on a venue error', async () => {
      fetchMock.mockResolvedValueOnce(
        errorResponse(403, 'venue_account_not_enabled'),
      );

      await expect(client.fetchBalance(venueId)).rejects.toMatchObject({
        status: 403,
        bodyCode: 'venue_account_not_enabled',
      });
      expect(invalidateSigningSession).not.toHaveBeenCalled();
      expect(signOperation).toHaveBeenCalledTimes(1);
    });

    it('does not sign reads that are not device-signed', async () => {
      fetchMock.mockResolvedValueOnce(createResponse({ json: { ok: true } }));

      await client.fetchVenueStatus(venueId);

      expect(signOperation).not.toHaveBeenCalled();
      const headers = (fetchMock.mock.calls[0][1] as RequestInit)
        .headers as Record<string, string>;
      expect(headers['Venue-Authorization']).toBeUndefined();
    });
  });

  describe('commitOrder', () => {
    const previewId = 'b3c2a1d0-1111-4222-8333-444455556666';

    it('posts the Preview reference only, authenticated', async () => {
      fetchMock.mockResolvedValue(createResponse());

      await client.commitOrder(venueId, { previewId });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://predict.example/api/v1/venues/kalshi/orders/commit',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'x-metamask-clientproduct': 'metamask-mobile',
            'x-metamask-clientversion': '7.0.0',
            Authorization: 'Bearer secret-token',
          },
          body: JSON.stringify({ previewId }),
          signal: undefined,
        },
      );
    });

    it('fails before HTTP when no bearer token is available', async () => {
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => undefined,
      });

      await expect(
        client.commitOrder(venueId, { previewId }),
      ).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('forwards an AbortSignal without retrying', async () => {
      fetchMock.mockResolvedValue(createResponse());
      const signal = new AbortController().signal;

      await client.commitOrder(venueId, { previewId }, { signal });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal }),
      );
    });

    it('signs the commit and renders the next step once when it changed', async () => {
      const header = { name: 'Venue-Authorization', value: 'envelope' };
      const signOperation = jest.fn().mockResolvedValue(header);
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation,
      });
      const signing = {
        step: 'submit',
        confirmed: true,
        inputs: { action: 'buy' },
        values: { price: '0.4500', count: '10.00' },
      };
      const moved = {
        code: 'venue_step_changed',
        next: {
          step: 'lookup',
          values: { order_id: 'c1b2c3d4-1111-4222-8333-444455556666' },
        },
      };
      const error = createResponse({ status: 409, json: moved });
      (error as unknown as { clone: () => Response }).clone = () =>
        createResponse({ status: 409, json: moved });
      fetchMock
        .mockResolvedValueOnce(error)
        .mockResolvedValueOnce(createResponse({ json: { ok: true } }));

      await expect(
        client.commitOrder(venueId, { previewId }, undefined, signing),
      ).resolves.toEqual({ ok: true });

      expect(signOperation).toHaveBeenNthCalledWith(
        2,
        'orders.commit',
        expect.objectContaining({ step: 'lookup', confirmed: false }),
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('surfaces the canonical backend code from an error body', async () => {
      fetchMock.mockResolvedValue(
        createResponse({ status: 410, json: { code: 'preview_expired' } }),
      );

      await expect(client.commitOrder(venueId, { previewId })).rejects.toEqual(
        expect.objectContaining({
          status: 410,
          bodyCode: 'preview_expired',
        }),
      );
    });
  });
});
