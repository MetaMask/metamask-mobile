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
import { KALSHI_VENUE_ID, type PredictVenueId } from '../types';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceMessenger,
} from './PredictMarketDataService';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    PredictNextGetVenueStatus: 'PredictNext Get Venue Status',
    PredictNextGetEvents: 'PredictNext Get Events',
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
  fetchEvents: jest.fn(),
  fetchEvent: jest.fn(),
});

describe('PredictMarketDataService', () => {
  const services: PredictMarketDataService[] = [];

  beforeAll(() => {
    jest.useFakeTimers({ advanceTimers: true });
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
    marketData.fetchEvents.mockResolvedValue({ items: [] });
    const service = buildService(marketData);
    const signal = new AbortController().signal;

    await service.getEvents(KALSHI_VENUE_ID, {}, undefined, { signal });

    expect(marketData.fetchEvents).toHaveBeenCalledWith(
      { cursor: undefined },
      { signal },
    );
  });

  it('stops Event pagination for an empty cursor', async () => {
    const marketData = createMarketData();
    marketData.fetchEvents.mockResolvedValue({ items: [], nextCursor: '' });
    const service = buildService(marketData);

    const result = await service.getEvents(KALSHI_VENUE_ID, {});

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

  it('traces Event list fetches with item count', async () => {
    const marketData = createMarketData();
    marketData.fetchEvents.mockResolvedValue({
      items: [{ id: 'event-1' }],
    } as never);
    const service = buildService(marketData);

    await service.getEvents(KALSHI_VENUE_ID, { limit: 20 });

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetEvents,
      op: TraceOperation.PredictDataFetch,
      id: expect.stringMatching(/^getEvents-\d+$/u),
      tags: { feature: PREDICT_NEXT_FEATURE_NAME, venueId: KALSHI_VENUE_ID },
      data: { hasCursor: false, limit: 20 },
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetEvents,
      id: expect.stringMatching(/^getEvents-\d+$/u),
      data: { success: true, itemCount: 1 },
    });
  });
});
