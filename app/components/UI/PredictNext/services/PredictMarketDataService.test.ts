import { ConstantBackoff } from '@metamask/controller-utils';
import { Messenger } from '@metamask/messenger';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import type { VenueMarketDataAdapter } from '../adapters/types';
import { PREDICT_NEXT_FEATURE_NAME } from '../constants';
import { PredictError, PredictErrorCode } from '../errors';
import {
  KALSHI_VENUE_ID,
  type PredictEntityId,
  type PredictFeedId,
  type PredictTimestamp,
  type PredictVenueId,
} from '../types';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceMessenger,
} from './PredictMarketDataService';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    PredictNextGetVenueStatus: 'PredictNext Get Venue Status',
    PredictNextGetFeed: 'PredictNext Get Feed',
    PredictNextGetEvent: 'PredictNext Get Event',
    PredictNextGetMarketHistory: 'PredictNext Get Market History',
  },
  TraceOperation: {
    PredictDataFetch: 'predict.data_fetch',
  },
}));

const createService = (marketData: VenueMarketDataAdapter) => {
  const messenger: PredictMarketDataServiceMessenger = new Messenger({
    namespace: 'PredictMarketDataService',
  });
  return new PredictMarketDataService({
    messenger,
    marketData,
    venueId: KALSHI_VENUE_ID,
    policyOptions: { backoff: new ConstantBackoff(0) },
  });
};

const createMarketData = (): jest.Mocked<VenueMarketDataAdapter> => ({
  fetchVenueStatus: jest.fn(),
  fetchFeed: jest.fn(),
  fetchEvent: jest.fn(),
  fetchMarketHistory: jest.fn(),
});

const feedId = 'sports-football-nfl-games' as PredictFeedId;
const marketId = 'market-1' as PredictEntityId;

describe('PredictMarketDataService', () => {
  const services: PredictMarketDataService[] = [];

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    services.splice(0).forEach((service) => service.destroy());
  });

  const buildService = (marketData: VenueMarketDataAdapter) => {
    const service = createService(marketData);
    services.push(service);
    return service;
  };

  it('rejects unsupported venues before invoking the adapter', async () => {
    const marketData = createMarketData();
    const service = buildService(marketData);

    const result = service.getVenueStatus('other' as PredictVenueId);

    await expect(result).rejects.toThrow(
      'This prediction venue is not supported.',
    );
    expect(marketData.fetchVenueStatus).not.toHaveBeenCalled();
  });

  it('forwards Event list cancellation to the adapter', async () => {
    const marketData = createMarketData();
    marketData.fetchFeed.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      id: feedId,
      title: 'NFL Games',
      events: [],
    });
    const service = buildService(marketData);
    const signal = new AbortController().signal;

    await service.getFeed(KALSHI_VENUE_ID, feedId, {}, undefined, { signal });

    expect(marketData.fetchFeed).toHaveBeenCalledWith(
      feedId,
      { cursor: undefined },
      { signal },
    );
  });

  it('stops Event pagination for an empty cursor', async () => {
    const marketData = createMarketData();
    marketData.fetchFeed.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      id: feedId,
      title: 'NFL Games',
      events: [],
      nextCursor: '',
    });
    const service = buildService(marketData);

    const result = await service.getFeed(KALSHI_VENUE_ID, feedId, {});

    expect(result.nextCursor).toBeUndefined();
  });

  it('traces Market history fetches with safe metadata and point count', async () => {
    const marketData = createMarketData();
    marketData.fetchMarketHistory.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      marketId,
      range: 'LIVE',
      observedAt: '2026-08-07T12:00:00Z' as PredictTimestamp,
      points: [
        {
          timestamp: '2026-08-07T11:00:00Z' as PredictTimestamp,
          yesPrice: '0.42',
          noPrice: '0.58',
        },
      ],
    } as never);
    const service = buildService(marketData);

    await service.getMarketHistory(KALSHI_VENUE_ID, marketId, 'LIVE');

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetMarketHistory,
      op: TraceOperation.PredictDataFetch,
      id: expect.stringMatching(/^getMarketHistory-\d+$/u),
      tags: {
        feature: PREDICT_NEXT_FEATURE_NAME,
        venueId: KALSHI_VENUE_ID,
        range: 'LIVE',
      },
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetMarketHistory,
      id: expect.stringMatching(/^getMarketHistory-\d+$/u),
      data: { success: true, pointCount: 1 },
    });
  });

  it('ends the Market history trace when the fetch fails', async () => {
    const marketData = createMarketData();
    marketData.fetchMarketHistory.mockRejectedValue(
      PredictError.from(PredictErrorCode.INVALID_RESPONSE),
    );
    const service = buildService(marketData);

    const result = service.getMarketHistory(KALSHI_VENUE_ID, marketId, '1D');

    await expect(result).rejects.toMatchObject({
      code: PredictErrorCode.INVALID_RESPONSE,
    });
    expect(trace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetMarketHistory,
      op: TraceOperation.PredictDataFetch,
      id: expect.stringMatching(/^getMarketHistory-\d+$/u),
      tags: {
        feature: PREDICT_NEXT_FEATURE_NAME,
        venueId: KALSHI_VENUE_ID,
        range: '1D',
      },
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetMarketHistory,
      id: expect.stringMatching(/^getMarketHistory-\d+$/u),
      data: {
        success: false,
        error: expect.any(String),
      },
    });
  });

  it('retries transient errors twice after the initial attempt', async () => {
    const marketData = createMarketData();
    marketData.fetchVenueStatus.mockRejectedValue(
      PredictError.from(PredictErrorCode.NETWORK_ERROR),
    );
    const service = buildService(marketData);

    const result = service.getVenueStatus(KALSHI_VENUE_ID);

    await expect(result).rejects.toMatchObject({
      code: PredictErrorCode.NETWORK_ERROR,
    });
    expect(marketData.fetchVenueStatus).toHaveBeenCalledTimes(3);
  });

  it('does not retry response contract errors', async () => {
    const marketData = createMarketData();
    marketData.fetchVenueStatus.mockRejectedValue(
      PredictError.from(PredictErrorCode.INVALID_RESPONSE),
    );
    const service = buildService(marketData);

    const result = service.getVenueStatus(KALSHI_VENUE_ID);

    await expect(result).rejects.toMatchObject({
      code: PredictErrorCode.INVALID_RESPONSE,
    });
    expect(marketData.fetchVenueStatus).toHaveBeenCalledTimes(1);
  });

  it('traces Feed fetches with Event count', async () => {
    const marketData = createMarketData();
    marketData.fetchFeed.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      id: feedId,
      title: 'NFL Games',
      events: [{ id: 'event-1' }],
    } as never);
    const service = buildService(marketData);

    await service.getFeed(KALSHI_VENUE_ID, feedId, { limit: 20 });

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetFeed,
      op: TraceOperation.PredictDataFetch,
      id: expect.stringMatching(/^getFeed-\d+$/u),
      tags: {
        feature: PREDICT_NEXT_FEATURE_NAME,
        venueId: KALSHI_VENUE_ID,
        feedId,
      },
      data: { hasCursor: false, limit: 20 },
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetFeed,
      id: expect.stringMatching(/^getFeed-\d+$/u),
      data: { success: true, eventCount: 1 },
    });
  });
});
