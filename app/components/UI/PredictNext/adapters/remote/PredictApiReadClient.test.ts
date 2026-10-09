import type {
  PredictEntityId,
  PredictFeedId,
  PredictMarketHistoryRange,
  PredictVenueId,
} from '../../types';
import { PredictApiReadClient, PredictHttpError } from './PredictApiReadClient';

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
    fetchMock = jest.fn();
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
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
