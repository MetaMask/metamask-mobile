import { PredictErrorCode } from '../../errors';
import type { PredictEntityId } from '../../types';
import { KalshiRemoteAdapter } from './KalshiRemoteAdapter';
import {
  type PredictApiReadTransport,
  PredictHttpError,
} from './PredictApiReadClient';

const eventId = 'event-1' as PredictEntityId;

const createEvent = (overrides = {}) => ({
  venueId: 'kalshi',
  id: 'event-1',
  title: 'Game outcome',
  markets: [
    {
      id: 'market-1',
      question: 'Will the team win?',
      status: 'open',
      outcomes: [
        {
          id: 'market-1-yes',
          side: 'yes',
          label: 'Yes',
          askPrice: '0.42',
          bidPrice: '0.40',
        },
        {
          id: 'market-1-no',
          side: 'no',
          label: 'No',
          askPrice: '0.61',
          bidPrice: '0.58',
        },
      ],
    },
  ],
  ...overrides,
});

const createClient = (): jest.Mocked<PredictApiReadTransport> => ({
  fetchVenueStatus: jest.fn(),
  fetchEvents: jest.fn(),
  fetchEvent: jest.fn(),
});

describe('KalshiRemoteAdapter', () => {
  let client: jest.Mocked<PredictApiReadTransport>;
  let adapter: KalshiRemoteAdapter;

  beforeEach(() => {
    client = createClient();
    adapter = new KalshiRemoteAdapter(client);
  });

  it('parses canonical Events from the Predict API', async () => {
    client.fetchEvents.mockResolvedValue({ items: [createEvent()] });

    const result = await adapter.marketData.fetchEvents({ limit: 20 });

    expect(result.items[0].markets[0].outcomes[0].askPrice).toBe('0.42');
  });

  it('forwards Event query parameters and cancellation', async () => {
    client.fetchEvents.mockResolvedValue({ items: [createEvent()] });
    const signal = new AbortController().signal;

    await adapter.marketData.fetchEvents({ limit: 20 }, { signal });

    expect(client.fetchEvents).toHaveBeenCalledWith(
      adapter.venueId,
      { limit: 20 },
      { signal },
    );
  });

  it('rejects an Event list containing another Venue', async () => {
    client.fetchEvents.mockResolvedValue({
      items: [createEvent({ venueId: 'other' })],
    });

    await expect(adapter.marketData.fetchEvents({})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('parses Event detail from the Predict API', async () => {
    client.fetchEvent.mockResolvedValue(createEvent());

    const result = await adapter.marketData.fetchEvent(eventId);

    expect(result.id).toBe(eventId);
  });

  it('rejects Event detail with another Event ID', async () => {
    client.fetchEvent.mockResolvedValue(createEvent({ id: 'event-2' }));

    await expect(adapter.marketData.fetchEvent(eventId)).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('parses Venue Status', async () => {
    client.fetchVenueStatus.mockResolvedValue({
      venueId: 'kalshi',
      status: 'degraded',
      checkedAt: '2026-08-07T12:00:00Z',
    });

    const result = await adapter.marketData.fetchVenueStatus();

    expect(result.status).toBe('degraded');
  });

  it('rejects Venue Status for another Venue', async () => {
    client.fetchVenueStatus.mockResolvedValue({
      venueId: 'other',
      status: 'available',
      checkedAt: '2026-08-07T12:00:00Z',
    });

    await expect(adapter.marketData.fetchVenueStatus()).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('maps HTTP 429 to RATE_LIMITED without response data', async () => {
    client.fetchEvents.mockRejectedValue(new PredictHttpError(429));

    await expect(adapter.marketData.fetchEvents({})).rejects.toEqual(
      expect.objectContaining({
        code: PredictErrorCode.RATE_LIMITED,
        metadata: undefined,
      }),
    );
  });

  it('maps HTTP 503 to VENUE_UNAVAILABLE', async () => {
    client.fetchEvents.mockRejectedValue(new PredictHttpError(503));

    await expect(adapter.marketData.fetchEvents({})).rejects.toEqual(
      expect.objectContaining({
        code: PredictErrorCode.VENUE_UNAVAILABLE,
      }),
    );
  });

  it.each([500, 502, 504])('maps HTTP %s to NETWORK_ERROR', async (status) => {
    client.fetchEvents.mockRejectedValue(new PredictHttpError(status));

    await expect(adapter.marketData.fetchEvents({})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.NETWORK_ERROR }),
    );
  });

  it('maps other transport failures to INVALID_RESPONSE', async () => {
    client.fetchEvents.mockRejectedValue(new Error('network detail'));

    await expect(adapter.marketData.fetchEvents({})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('preserves AbortError', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    client.fetchEvents.mockRejectedValue(abortError);

    await expect(adapter.marketData.fetchEvents({})).rejects.toBe(abortError);
  });
});
