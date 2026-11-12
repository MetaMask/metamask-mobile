import Logger from '../../../../../util/Logger';
import type {
  PredictEntityId,
  PredictFeedId,
  PredictMarketHistoryRange,
  PredictVenueId,
} from '../../types';
import { TemplateError } from '../../auth/signing/profileTemplates';
import {
  PredictApiReadClient,
  PredictHttpError,
  PredictReadBudgetExhaustedError,
  PredictRequestNotSentError,
  PredictSigningError,
} from './PredictApiReadClient';
import {
  VenueSigningRefusedError,
  VenueSigningUnavailableError,
  type ProposedRead,
} from './signedVenueCall';

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

/** A response whose `clone()` yields the same status and error code. */
const errorResponse = (status: number, code: string): Response => {
  const response = createResponse({ status, json: { code } });
  (response as unknown as { clone: () => Response }).clone = () =>
    createResponse({ status, json: { code } });
  return response;
};

/**
 * A 200 `sign_required` proposal body. `clone()` must work: the client
 * describes the proposal from a clone so the caller can still parse the
 * original body.
 */
const signRequired = (
  path: string,
  query = '',
  requestId?: string,
): Response => {
  const body = {
    kind: 'sign_required',
    request: {
      method: 'GET',
      path,
      query,
      ...(requestId !== undefined && { requestId }),
    },
  };
  const response = createResponse({ status: 200, json: body });
  (response as unknown as { clone: () => Response }).clone = () =>
    createResponse({ status: 200, json: body });
  return response;
};

const SIGNED_READ_HEADER = {
  name: 'Venue-Authorization',
  value: 'envelope',
};

/** Signer whose returned header records the proposal it signed. */
const makeSignRead = () =>
  jest.fn().mockImplementation(async (proposed: ProposedRead) => ({
    ...SIGNED_READ_HEADER,
    signedPath: proposed.path,
    signedQuery: proposed.query,
  }));

const SIGNED_OPERATION = {
  header: SIGNED_READ_HEADER,
  body: '{"ticker":"MKT-1"}',
  idempotencyKey: 'op-key',
};

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
      signOperation: async () => SIGNED_OPERATION,
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

  it('sends the two-phase signed read for Balance and parses the result', async () => {
    const signRead = makeSignRead();
    fetchMock
      .mockResolvedValueOnce(signRequired('/trade-api/v2/portfolio/balance'))
      .mockResolvedValueOnce(
        createResponse({
          json: { kind: 'result', balance: { available: '1.0000' } },
        }),
      );
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
      signRead,
    });

    await expect(client.fetchBalance(venueId)).resolves.toEqual({
      kind: 'result',
      balance: { available: '1.0000' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url = 'https://predict.example/api/v1/venues/kalshi/balance';
    // Phase one: bearer-only.
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      url,
      expect.objectContaining({ method: 'GET' }),
    );
    const firstHeaders = (fetchMock.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(firstHeaders['Venue-Authorization']).toBeUndefined();
    // Phase two: the SAME URL with the envelope and the signed venue GET.
    expect(fetchMock).toHaveBeenNthCalledWith(2, url, expect.anything());
    const secondHeaders = (fetchMock.mock.calls[1][1] as RequestInit)
      .headers as Record<string, string>;
    expect(secondHeaders['Venue-Authorization']).toBe('envelope');
    expect(secondHeaders['venue-read']).toBe('/trade-api/v2/portfolio/balance');
    // The phone signed exactly the bytes the server proposed.
    expect(signRead).toHaveBeenCalledWith({
      method: 'GET',
      path: '/trade-api/v2/portfolio/balance',
      query: '',
    });
  });

  it('fails before HTTP when no bearer token is available', async () => {
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

  it('sends the Positions status filter as a comma-separated list', async () => {
    const signRead = makeSignRead();
    fetchMock
      .mockResolvedValueOnce(signRequired('/trade-api/v2/portfolio/positions'))
      .mockResolvedValueOnce(
        createResponse({ json: { kind: 'result', positions: [] } }),
      );
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
      signRead,
    });

    await client.fetchPositions(venueId, {
      limit: 3,
      status: ['open', 'claimable'],
      sort: 'value',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/positions?limit=3&sort=value&status=open%2Cclaimable',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('pages with the route cursor: every page is its own signed read', async () => {
    const signRead = makeSignRead();
    const query = 'count_filter=position&limit=1000';
    fetchMock
      .mockResolvedValueOnce(
        signRequired('/trade-api/v2/portfolio/positions', query),
      )
      .mockResolvedValueOnce(
        createResponse({ json: { kind: 'result', positions: [] } }),
      );
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
      signRead,
    });

    await client.fetchPositions(venueId, { limit: 20, cursor: 'c-2' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://predict.example/api/v1/venues/kalshi/positions?limit=20&cursor=c-2',
      expect.anything(),
    );
    const headers = (fetchMock.mock.calls[1][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers['venue-read']).toBe(
      `/trade-api/v2/portfolio/positions?${query}`,
    );
  });

  it('authenticates Activity requests with encoded page parameters', async () => {
    const signRead = makeSignRead();
    fetchMock
      .mockResolvedValueOnce(
        signRequired('/trade-api/v2/portfolio/settlements'),
      )
      .mockResolvedValueOnce(
        createResponse({ json: { kind: 'result', activity: [] } }),
      );
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
      signRead,
    });

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

  describe('device-signed reads', () => {
    let signRead: jest.Mock;

    beforeEach(() => {
      signRead = makeSignRead();
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signRead,
      });
    });

    it('sends nothing more when the Engine refuses the proposed read', async () => {
      // The Engine's signer is the allowlist boundary; its refusal is a
      // TemplateError and the signed call never goes out.
      signRead.mockRejectedValueOnce(new TemplateError('class'));
      fetchMock.mockResolvedValueOnce(
        signRequired('/trade-api/v2/admin/secret'),
      );

      const failed = client.fetchBalance(venueId);
      await expect(failed).rejects.toBeInstanceOf(PredictSigningError);
      await expect(failed).rejects.not.toBeInstanceOf(
        PredictRequestNotSentError,
      );
      await expect(failed).rejects.toMatchObject({
        status: 400,
        bodyCode: 'venue_signing_refused',
        requestSent: true,
        cause: expect.objectContaining({ rule: 'class' }),
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('fails before HTTP when the client has no read signer', async () => {
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

    it('preserves dispatch when signing is unavailable after the bearer GET', async () => {
      signRead.mockResolvedValueOnce(undefined);
      fetchMock.mockResolvedValueOnce(
        signRequired('/trade-api/v2/portfolio/balance'),
      );

      const failed = client.fetchBalance(venueId);
      await expect(failed).rejects.toBeInstanceOf(PredictSigningError);
      await expect(failed).rejects.not.toBeInstanceOf(
        PredictRequestNotSentError,
      );
      await expect(failed).rejects.toMatchObject({
        bodyCode: 'venue_signing_unavailable',
        requestSent: true,
        cause: expect.any(VenueSigningUnavailableError),
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(signRead).toHaveBeenCalledTimes(1);
    });

    it('returns the raw response body when the proposal flow does not describe it', async () => {
      // A 200 body that is not `sign_required` comes back as-is.
      fetchMock.mockResolvedValueOnce(
        createResponse({ json: { unexpected: 'shape' } }),
      );

      await expect(client.fetchBalance(venueId)).resolves.toEqual({
        unexpected: 'shape',
      });
      expect(signRead).not.toHaveBeenCalled();
    });

    it('surfaces a non-renewable venue error from the signed re-call', async () => {
      fetchMock
        .mockResolvedValueOnce(signRequired('/trade-api/v2/portfolio/balance'))
        .mockResolvedValueOnce(errorResponse(403, 'venue_account_not_enabled'));

      await expect(client.fetchBalance(venueId)).rejects.toMatchObject({
        status: 403,
        bodyCode: 'venue_account_not_enabled',
      });
      expect(signRead).toHaveBeenCalledTimes(1);
    });

    it('re-signs the proposed read once when the signature expired in flight', async () => {
      // The renewal repeats the WHOLE two-phase exchange: the second attempt
      // proposes again (phase one) before signing again (phase two).
      fetchMock
        .mockResolvedValueOnce(signRequired('/trade-api/v2/portfolio/balance'))
        .mockResolvedValueOnce(errorResponse(409, 'venue_signature_expired'))
        .mockResolvedValueOnce(signRequired('/trade-api/v2/portfolio/balance'))
        .mockResolvedValueOnce(
          createResponse({
            json: { kind: 'result', balance: { available: '2' } },
          }),
        );

      await expect(client.fetchBalance(venueId)).resolves.toEqual({
        kind: 'result',
        balance: { available: '2' },
      });
      expect(signRead).toHaveBeenCalledTimes(2);
    });

    it('preserves dispatched reads when auth renewal is refused', async () => {
      const invalidateSigningSession = jest.fn();
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signRead,
        invalidateSigningSession,
      });
      // The first signature succeeds; the renewed proposal is refused.
      signRead
        .mockReset()
        .mockResolvedValueOnce(SIGNED_READ_HEADER)
        .mockRejectedValueOnce(new TemplateError('class'));
      fetchMock
        .mockResolvedValueOnce(signRequired('/trade-api/v2/portfolio/balance'))
        .mockResolvedValueOnce(errorResponse(403, 'venue_authorization_invalid'))
        .mockResolvedValueOnce(signRequired('/trade-api/v2/portfolio/balance'));

      const failed = client.fetchBalance(venueId);
      await expect(failed).rejects.toBeInstanceOf(PredictSigningError);
      await expect(failed).rejects.not.toBeInstanceOf(
        PredictRequestNotSentError,
      );
      await expect(failed).rejects.toMatchObject({
        bodyCode: 'venue_signing_refused',
        requestSent: true,
        cause: expect.any(VenueSigningRefusedError),
      });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(signRead).toHaveBeenCalledTimes(2);
      expect(invalidateSigningSession).toHaveBeenCalledTimes(1);
    });

    it('surfaces the second renewal failure instead of looping', async () => {
      fetchMock
        .mockResolvedValueOnce(signRequired('/trade-api/v2/portfolio/balance'))
        .mockResolvedValueOnce(errorResponse(409, 'venue_signature_expired'))
        .mockResolvedValueOnce(signRequired('/trade-api/v2/portfolio/balance'))
        .mockResolvedValueOnce(errorResponse(409, 'venue_signature_expired'));

      await expect(client.fetchBalance(venueId)).rejects.toMatchObject({
        status: 409,
        bodyCode: 'venue_signature_expired',
      });
      expect(signRead).toHaveBeenCalledTimes(2);
    });
  });

  it('does not sign reads that are not device-signed', async () => {
    const signOperation = jest.fn();
    fetchMock.mockResolvedValueOnce(createResponse({ json: { ok: true } }));
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
      signOperation,
    });

    await client.fetchVenueStatus(venueId);

    expect(signOperation).not.toHaveBeenCalled();
    const headers = (fetchMock.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers['Venue-Authorization']).toBeUndefined();
  });

  describe('observeOrder', () => {
    const previewId = 'b3c2a1d0-1111-4222-8333-444455556666';

    it('reads the receipt bearer-only while nothing needs a signature', async () => {
      const signRead = makeSignRead();
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signRead,
      });
      fetchMock.mockResolvedValueOnce(
        createResponse({ json: { previewId, status: 'filled' } }),
      );

      await expect(
        client.observeOrder(venueId, { previewId }),
      ).resolves.toEqual({ previewId, status: 'filled' });
      expect(fetchMock).toHaveBeenCalledWith(
        `https://predict.example/api/v1/venues/kalshi/orders/${previewId}`,
        expect.objectContaining({ method: 'GET' }),
      );
      expect(signRead).not.toHaveBeenCalled();
    });

    it('signs the venue order scan the backend proposes while it reconciles', async () => {
      const signRead = makeSignRead();
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signRead,
      });
      const scan = 'limit=200&min_ts=1&ticker=MKT-1';
      const requestId = 'a1b2c3d4-1111-4222-8333-444455556666';
      fetchMock
        .mockResolvedValueOnce(
          signRequired('/trade-api/v2/portfolio/orders', scan, requestId),
        )
        .mockResolvedValueOnce(
          createResponse({ json: { previewId, status: 'filled' } }),
        );

      await client.observeOrder(venueId, { previewId });

      expect(signRead).toHaveBeenCalledWith({
        method: 'GET',
        path: '/trade-api/v2/portfolio/orders',
        query: scan,
        requestId,
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(
        fetchMock.mock.calls.every(([, init]) => init?.method === 'GET'),
      ).toBe(true);
    });

    it('defers after two signed scan pages and resumes the server cursor on a later observe', async () => {
      const signRead = makeSignRead();
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signRead,
      });
      const path = '/trade-api/v2/portfolio/orders';
      const challenges = [
        'a1b2c3d4-1111-4222-8333-444455556660',
        'a1b2c3d4-1111-4222-8333-444455556661',
        'a1b2c3d4-1111-4222-8333-444455556662',
        'a1b2c3d4-1111-4222-8333-444455556663',
      ];
      // The backend owns this progress. Bearer-only observation reads it;
      // only the expected signed page advances it, never restarting at 0.
      let serverPage = 0;
      const acceptedPages: number[] = [];
      fetchMock.mockImplementation(async (_url, init) => {
        expect(init?.method).toBe('GET');
        const headers = init?.headers as Record<string, string>;
        if (headers['Venue-Authorization']) {
          expect(headers['venue-read']).toBe(
            `${path}?cursor=page-${serverPage}`,
          );
          acceptedPages.push(serverPage);
          serverPage += 1;
        }
        return serverPage === 4
          ? createResponse({ json: { previewId, status: 'filled' } })
          : signRequired(
              path,
              `cursor=page-${serverPage}`,
              challenges[serverPage],
            );
      });

      const deferred = client.observeOrder(venueId, { previewId });
      await expect(deferred).rejects.toBeInstanceOf(
        PredictReadBudgetExhaustedError,
      );
      await expect(deferred).rejects.not.toBeInstanceOf(
        PredictRequestNotSentError,
      );
      await expect(deferred).rejects.toMatchObject({
        bodyCode: 'venue_read_budget_exhausted',
        requestSent: true,
      });
      expect(serverPage).toBe(2);
      expect(signRead).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(3);

      await expect(client.observeOrder(venueId, { previewId })).resolves.toEqual({
        previewId,
        status: 'filled',
      });
      expect(signRead.mock.calls.map(([proposal]) => proposal)).toEqual(
        challenges.map((requestId, page) => ({
          method: 'GET',
          path,
          query: `cursor=page-${page}`,
          requestId,
        })),
      );
      expect(acceptedPages).toEqual([0, 1, 2, 3]);
      expect(fetchMock).toHaveBeenCalledTimes(6);
      expect(
        fetchMock.mock.calls.every(
          ([url, init]) =>
            url ===
              `https://predict.example/api/v1/venues/kalshi/orders/${previewId}` &&
            init?.method === 'GET',
        ),
      ).toBe(true);
    });

    it('does not sign a malformed reconciliation challenge', async () => {
      const signRead = makeSignRead();
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signRead,
      });
      fetchMock.mockResolvedValueOnce(
        signRequired('/trade-api/v2/portfolio/orders', '', 'not-a-uuid'),
      );

      await client.observeOrder(venueId, { previewId });

      expect(signRead).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('commitOrder', () => {
    const previewId = 'b3c2a1d0-1111-4222-8333-444455556666';
    const signing = {
      inputs: {
        marketId: 'MKT-1',
        idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
        action: 'buy',
        outcome: 'yes',
        amountCents: 5000,
      },
      values: { count: '10.00', price: '0.5000' },
      confirmed: true,
    };

    it('throws before HTTP when called without signing inputs', async () => {
      const failed = client.commitOrder(venueId, { previewId });
      await expect(failed).rejects.toBeInstanceOf(PredictRequestNotSentError);
      await expect(failed).rejects.toMatchObject({
        status: 400,
        bodyCode: 'venue_signing_unavailable',
        requestSent: false,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('marks the mutation unsent when no operation signer is installed', async () => {
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
      });

      const failed = client.commitOrder(
        venueId,
        { previewId },
        undefined,
        signing,
      );
      await expect(failed).rejects.toBeInstanceOf(PredictRequestNotSentError);
      await expect(failed).rejects.toMatchObject({
        bodyCode: 'venue_signing_unavailable',
        requestSent: false,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('marks a signer returning unavailable before dispatch as unsent', async () => {
      const signOperation = jest.fn().mockResolvedValue(undefined);
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation,
      });

      const failed = client.commitOrder(
        venueId,
        { previewId },
        undefined,
        signing,
      );
      await expect(failed).rejects.toBeInstanceOf(PredictRequestNotSentError);
      await expect(failed).rejects.toMatchObject({
        bodyCode: 'venue_signing_unavailable',
        requestSent: false,
        cause: expect.any(VenueSigningUnavailableError),
      });
      expect(signOperation).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends the signed body bytes verbatim with the envelope header', async () => {
      const signOperation = jest.fn().mockResolvedValue(SIGNED_OPERATION);
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation,
      });
      fetchMock.mockResolvedValueOnce(
        createResponse({ json: { ok: true, orderId: 'o-1' } }),
      );

      await expect(
        client.commitOrder(venueId, { previewId }, undefined, signing),
      ).resolves.toEqual({ ok: true, orderId: 'o-1' });

      expect(signOperation).toHaveBeenCalledTimes(1);
      expect(signOperation).toHaveBeenCalledWith('order.place', signing);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      // The Preview reference rides in the path; the body is the signed
      // create_order bytes alone.
      expect(fetchMock).toHaveBeenCalledWith(
        `https://predict.example/api/v1/venues/kalshi/orders/${previewId}/commit`,
        expect.objectContaining({
          method: 'POST',
          // The envelope's content-digest pins these bytes: never re-stringified.
          body: SIGNED_OPERATION.body,
        }),
      );
      const headers = (fetchMock.mock.calls[0][1] as RequestInit)
        .headers as Record<string, string>;
      expect(headers['Venue-Authorization']).toBe(
        SIGNED_OPERATION.header.value,
      );
    });

    it('fails before HTTP when no bearer token is available', async () => {
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => undefined,
        signOperation: async () => SIGNED_OPERATION,
      });

      await expect(
        client.commitOrder(venueId, { previewId }, undefined, signing),
      ).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('forwards an AbortSignal without retrying', async () => {
      const signOperation = jest.fn().mockResolvedValue(SIGNED_OPERATION);
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation,
      });
      fetchMock.mockResolvedValue(createResponse());
      const signal = new AbortController().signal;

      await client.commitOrder(venueId, { previewId }, { signal }, signing);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal }),
      );
    });

    it('drops the A2T and signs again once on venue_authorization_invalid', async () => {
      const signOperation = jest.fn().mockResolvedValue(SIGNED_OPERATION);
      const invalidateSigningSession = jest.fn();
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation,
        invalidateSigningSession,
      });
      fetchMock
        .mockResolvedValueOnce(
          errorResponse(403, 'venue_authorization_invalid'),
        )
        .mockResolvedValueOnce(createResponse({ json: { ok: true } }));

      await expect(
        client.commitOrder(venueId, { previewId }, undefined, signing),
      ).resolves.toEqual({ ok: true });
      expect(invalidateSigningSession).toHaveBeenCalledTimes(1);
      expect(signOperation).toHaveBeenCalledTimes(2);
      // The re-sign does not ask the user to confirm again.
      expect(signOperation).toHaveBeenLastCalledWith(
        'order.place',
        expect.objectContaining({ confirmed: false }),
      );
    });

    it('signs again once, keeping the A2T, on venue_signature_expired', async () => {
      const signOperation = jest.fn().mockResolvedValue(SIGNED_OPERATION);
      const invalidateSigningSession = jest.fn();
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation,
        invalidateSigningSession,
      });
      fetchMock
        .mockResolvedValueOnce(errorResponse(409, 'venue_signature_expired'))
        .mockResolvedValueOnce(createResponse({ json: { ok: true } }));

      await expect(
        client.commitOrder(venueId, { previewId }, undefined, signing),
      ).resolves.toEqual({ ok: true });
      expect(invalidateSigningSession).not.toHaveBeenCalled();
      expect(signOperation).toHaveBeenCalledTimes(2);
    });

    it.each([
      {
        status: 403,
        code: 'venue_authorization_invalid',
        failure: 'unavailable',
      },
      { status: 403, code: 'venue_authorization_invalid', failure: 'refused' },
      {
        status: 409,
        code: 'venue_signature_expired',
        failure: 'unavailable',
      },
      { status: 409, code: 'venue_signature_expired', failure: 'refused' },
    ])(
      'never marks the mutation unsent when $code renewal is $failure',
      async ({ status, code, failure }) => {
        const signOperation = jest.fn().mockResolvedValueOnce(SIGNED_OPERATION);
        if (failure === 'refused') {
          signOperation.mockRejectedValueOnce(new TemplateError('intent'));
        } else {
          signOperation.mockResolvedValueOnce(undefined);
        }
        const invalidateSigningSession = jest.fn();
        client = new PredictApiReadClient({
          baseUrl: 'https://predict.example/api/',
          clientVersion: '7.0.0',
          fetch: fetchMock,
          getBearerToken: async () => 'secret-token',
          signOperation,
          invalidateSigningSession,
        });
        fetchMock.mockResolvedValueOnce(errorResponse(status, code));

        const failed = client.commitOrder(
          venueId,
          { previewId },
          undefined,
          signing,
        );
        await expect(failed).rejects.toBeInstanceOf(PredictSigningError);
        await expect(failed).rejects.not.toBeInstanceOf(
          PredictRequestNotSentError,
        );
        await expect(failed).rejects.toMatchObject({
          bodyCode: `venue_signing_${failure}`,
          requestSent: true,
        });
        expect(signOperation).toHaveBeenCalledTimes(2);
        expect(signOperation).toHaveBeenLastCalledWith(
          'order.place',
          expect.objectContaining({ confirmed: false }),
        );
        expect(invalidateSigningSession).toHaveBeenCalledTimes(
          status === 403 ? 1 : 0,
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `https://predict.example/api/v1/venues/kalshi/orders/${previewId}/commit`,
          expect.objectContaining({ method: 'POST', body: SIGNED_OPERATION.body }),
        );
      },
    );

    it('never re-posts a mutation after an ambiguous fetch failure', async () => {
      const signOperation = jest.fn().mockResolvedValue(SIGNED_OPERATION);
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation,
      });
      const networkFailure = new TypeError('connection closed before response');
      fetchMock.mockRejectedValueOnce(networkFailure);

      const failed = client.commitOrder(
        venueId,
        { previewId },
        undefined,
        signing,
      );
      await expect(failed).rejects.toBe(networkFailure);
      await expect(failed).rejects.not.toBeInstanceOf(
        PredictRequestNotSentError,
      );
      expect(signOperation).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('surfaces the canonical backend code from an error body', async () => {
      const signOperation = jest.fn().mockResolvedValue(SIGNED_OPERATION);
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation,
      });
      fetchMock.mockResolvedValueOnce(errorResponse(410, 'preview_expired'));

      await expect(
        client.commitOrder(venueId, { previewId }, undefined, signing),
      ).rejects.toEqual(
        expect.objectContaining({
          status: 410,
          bodyCode: 'preview_expired',
        }),
      );
      expect(signOperation).toHaveBeenCalledTimes(1);
    });

    it('does not send a call the profile refused', async () => {
      client = new PredictApiReadClient({
        baseUrl: 'https://predict.example/api/',
        clientVersion: '7.0.0',
        fetch: fetchMock,
        getBearerToken: async () => 'secret-token',
        signOperation: jest.fn().mockRejectedValue(new TemplateError('intent')),
      });

      await expect(
        client.commitOrder(venueId, { previewId }, undefined, signing),
      ).rejects.toMatchObject({
        status: 400,
        bodyCode: 'venue_signing_refused',
        requestSent: false,
        cause: expect.objectContaining({ rule: 'intent' }),
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
