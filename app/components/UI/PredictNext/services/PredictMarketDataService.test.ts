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
  type PredictFeedId,
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
});

const feedId = 'sports-football-nfl-games' as PredictFeedId;

describe('PredictMarketDataService', () => {
  const services: PredictMarketDataService[] = [];

  beforeAll(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    services.splice(0).forEach((service) => service.destroy());
  });

  afterAll(() => {
    jest.useRealTimers();
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
