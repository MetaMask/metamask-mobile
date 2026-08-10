import { ConstantBackoff } from '@metamask/controller-utils';
import { Messenger } from '@metamask/messenger';
import type { VenueMarketDataAdapter } from '../adapters/types';
import { PredictError, PredictErrorCode } from '../errors';
import { KALSHI_VENUE_ID, type PredictVenueId } from '../types';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceMessenger,
} from './PredictMarketDataService';

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

  afterEach(() => {
    services.splice(0).forEach((service) => service.destroy());
  });

  const buildService = (marketData: VenueMarketDataAdapter) => {
    const service = createService(marketData);
    services.push(service);
    return service;
  };

  it('rejects unsupported venues before invoking the adapter', () => {
    const marketData = createMarketData();
    const service = buildService(marketData);

    const act = () => service.getVenueStatus('other' as PredictVenueId);

    expect(act).toThrow('This prediction venue is not supported.');
    expect(marketData.fetchVenueStatus).not.toHaveBeenCalled();
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
});
