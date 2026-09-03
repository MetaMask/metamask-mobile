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
    });
  });

  it('requests Venue Status without authorization or content type headers', async () => {
    fetchMock.mockResolvedValue(createResponse());

    await client.fetchVenueStatus(venueId);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/api/v1/venues/kalshi/status',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-metamask-clientproduct': 'metamask-mobile',
          'x-metamask-clientversion': '7.0.0',
        },
        signal: undefined,
      },
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
});
