import {
  BrokenCircuitError,
  ConstantBackoff,
} from '@metamask/controller-utils';
import { Messenger } from '@metamask/messenger';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import type { VenuePortfolioAdapter } from '../adapters/types';
import { PREDICT_NEXT_FEATURE_NAME } from '../constants';
import { PredictError, PredictErrorCode } from '../errors';
import { portfolioQueries } from '../queries/portfolioQueries';
import {
  KALSHI_VENUE_ID,
  type PredictAmount,
  type PredictVenueId,
} from '../types';
import {
  PredictPortfolioService,
  type PredictPortfolioServiceMessenger,
} from './PredictPortfolioService';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: { PredictNextGetBalance: 'PredictNext Get Balance' },
  TraceOperation: { PredictDataFetch: 'predict.data_fetch' },
}));

const createPortfolio = (): jest.Mocked<VenuePortfolioAdapter> => ({
  fetchBalance: jest.fn(),
});

const createService = (portfolio: VenuePortfolioAdapter) => {
  const messenger: PredictPortfolioServiceMessenger = new Messenger({
    namespace: 'PredictPortfolioService',
  });
  return new PredictPortfolioService({
    messenger,
    portfolio,
    venueId: KALSHI_VENUE_ID,
    policyOptions: {
      backoff: new ConstantBackoff(0),
      maxConsecutiveFailures: 3,
    },
  });
};

describe('PredictPortfolioService', () => {
  const services: PredictPortfolioService[] = [];

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    services.splice(0).forEach((service) => service.destroy());
  });

  const buildService = (portfolio: VenuePortfolioAdapter) => {
    const service = createService(portfolio);
    services.push(service);
    return service;
  };

  it('rejects unsupported venues before invoking the adapter', async () => {
    const portfolio = createPortfolio();
    const service = buildService(portfolio);

    const result = service.getBalance('other' as PredictVenueId);

    await expect(result).rejects.toThrow(
      'This prediction venue is not supported.',
    );
    expect(portfolio.fetchBalance).not.toHaveBeenCalled();
  });

  it('uses the Venue-qualified Balance descriptor', () => {
    const descriptor = portfolioQueries.getBalance(KALSHI_VENUE_ID);

    expect(descriptor).toEqual({
      queryKey: ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
      family: ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
      staleTime: 60_000,
      scope: 'venue',
    });
  });

  it('retries transient errors twice after the initial attempt', async () => {
    const portfolio = createPortfolio();
    portfolio.fetchBalance.mockRejectedValue(
      PredictError.from(PredictErrorCode.NETWORK_ERROR),
    );
    const service = buildService(portfolio);

    const result = service.getBalance(KALSHI_VENUE_ID);

    await expect(result).rejects.toMatchObject({
      code: PredictErrorCode.NETWORK_ERROR,
    });
    expect(portfolio.fetchBalance).toHaveBeenCalledTimes(3);
  });

  it('does not retry response contract errors', async () => {
    const portfolio = createPortfolio();
    portfolio.fetchBalance.mockRejectedValue(
      PredictError.from(PredictErrorCode.INVALID_RESPONSE),
    );
    const service = buildService(portfolio);

    const result = service.getBalance(KALSHI_VENUE_ID);

    await expect(result).rejects.toMatchObject({
      code: PredictErrorCode.INVALID_RESPONSE,
    });
    expect(portfolio.fetchBalance).toHaveBeenCalledTimes(1);
  });

  it('opens its circuit after portfolio failures', async () => {
    const portfolio = createPortfolio();
    portfolio.fetchBalance.mockRejectedValue(
      PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE),
    );
    const service = buildService(portfolio);

    await expect(service.getBalance(KALSHI_VENUE_ID)).rejects.toMatchObject({
      code: PredictErrorCode.VENUE_UNAVAILABLE,
    });
    const result = service.getBalance(KALSHI_VENUE_ID);

    await expect(result).rejects.toBeInstanceOf(BrokenCircuitError);
    expect(portfolio.fetchBalance).toHaveBeenCalledTimes(3);
  });

  it('traces Balance without including its amount', async () => {
    const portfolio = createPortfolio();
    portfolio.fetchBalance.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      currency: 'USD',
      available: '123.45' as PredictAmount,
    });
    const service = buildService(portfolio);

    await service.getBalance(KALSHI_VENUE_ID);

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetBalance,
      op: TraceOperation.PredictDataFetch,
      id: expect.stringMatching(/^getBalance-\d+$/u),
      tags: {
        feature: PREDICT_NEXT_FEATURE_NAME,
        venueId: KALSHI_VENUE_ID,
      },
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetBalance,
      id: expect.stringMatching(/^getBalance-\d+$/u),
      data: { success: true },
    });
    expect(JSON.stringify(jest.mocked(endTrace).mock.calls)).not.toContain(
      '123.45',
    );
  });
});
