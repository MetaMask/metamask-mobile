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
  type PredictEntityId,
  type PredictTimestamp,
  type PredictVenueId,
} from '../types';
import {
  PredictPortfolioService,
  type PredictPortfolioServiceMessenger,
} from './PredictPortfolioService';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    PredictNextGetBalance: 'PredictNext Get Balance',
    PredictNextGetPositions: 'PredictNext Get Positions',
    PredictNextGetActivity: 'PredictNext Get Activity',
  },
  TraceOperation: { PredictDataFetch: 'predict.data_fetch' },
}));

const createPortfolio = (): jest.Mocked<VenuePortfolioAdapter> => ({
  fetchBalance: jest.fn(),
  fetchPositions: jest.fn(),
  fetchActivity: jest.fn(),
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

    await expect(
      service.getPositions('other' as PredictVenueId, { limit: 20 }),
    ).rejects.toThrow('This prediction venue is not supported.');
    await expect(
      service.getActivity('other' as PredictVenueId, { limit: 20 }),
    ).rejects.toThrow('This prediction venue is not supported.');
    expect(portfolio.fetchPositions).not.toHaveBeenCalled();
    expect(portfolio.fetchActivity).not.toHaveBeenCalled();
  });

  it('uses the Venue-qualified Balance descriptor', () => {
    const descriptor = portfolioQueries.getBalance(KALSHI_VENUE_ID);

    expect(descriptor).toEqual({
      queryKey: ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
      family: ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
      staleTime: 60_000,
      scope: 'venue',
    });
    expect(
      portfolioQueries.getPositions(KALSHI_VENUE_ID, { limit: 20 }),
    ).toEqual({
      queryKey: [
        'PredictPortfolioService:getPositions',
        KALSHI_VENUE_ID,
        { limit: 20 },
      ],
      family: ['PredictPortfolioService:getPositions', KALSHI_VENUE_ID],
      staleTime: 30_000,
      scope: 'venue',
    });
    expect(
      portfolioQueries.getActivity(KALSHI_VENUE_ID, { limit: 20 }),
    ).toEqual({
      queryKey: [
        'PredictPortfolioService:getActivity',
        KALSHI_VENUE_ID,
        { limit: 20 },
      ],
      family: ['PredictPortfolioService:getActivity', KALSHI_VENUE_ID],
      staleTime: 30_000,
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

  it('fetches Positions through the adapter and forwards the cursor', async () => {
    const portfolio = createPortfolio();
    const page = {
      venueId: KALSHI_VENUE_ID,
      positions: [],
      nextCursor: 'next-page',
    };
    portfolio.fetchPositions.mockResolvedValue(page);
    const service = buildService(portfolio);

    const result = await service.getPositions(
      KALSHI_VENUE_ID,
      { limit: 20 },
      'opaque-cursor',
    );

    expect(result).toEqual(page);
    expect(portfolio.fetchPositions).toHaveBeenCalledWith(
      { limit: 20, cursor: 'opaque-cursor' },
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('fetches Activity through the adapter and forwards the cursor', async () => {
    const portfolio = createPortfolio();
    const page = {
      venueId: KALSHI_VENUE_ID,
      activity: [],
    };
    portfolio.fetchActivity.mockResolvedValue(page);
    const service = buildService(portfolio);

    const result = await service.getActivity(KALSHI_VENUE_ID, { limit: 20 });

    expect(result).toEqual(page);
    expect(portfolio.fetchActivity).toHaveBeenCalledWith(
      { limit: 20, cursor: undefined },
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('traces Positions and Activity with counts only, never amounts', async () => {
    const portfolio = createPortfolio();
    portfolio.fetchPositions.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      positions: [
        {
          venueId: KALSHI_VENUE_ID,
          marketId: 'market-1' as PredictEntityId,
          side: 'yes' as const,
          shares: '75.00' as PredictAmount,
          marketExposure: '41.25' as PredictAmount,
        },
      ],
    });
    portfolio.fetchActivity.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      activity: [
        {
          type: 'settlement' as const,
          id: 'market-1:2026-09-01T00:00:00.000Z' as PredictEntityId,
          venueId: KALSHI_VENUE_ID,
          marketId: 'market-1' as PredictEntityId,
          result: 'yes' as const,
          proceeds: '41.50' as PredictAmount,
          timestamp: '2026-09-01T00:00:00.000Z' as PredictTimestamp,
        },
      ],
    });
    const service = buildService(portfolio);

    await service.getPositions(KALSHI_VENUE_ID, { limit: 20 });
    await service.getActivity(KALSHI_VENUE_ID, { limit: 20 });

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({ name: TraceName.PredictNextGetPositions }),
    );
    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({ name: TraceName.PredictNextGetActivity }),
    );
    const traced = JSON.stringify(jest.mocked(trace).mock.calls);
    expect(traced).not.toContain('41.25');
    expect(traced).not.toContain('41.50');
    expect(JSON.stringify(jest.mocked(endTrace).mock.calls)).toContain(
      'positionCount',
    );
    expect(JSON.stringify(jest.mocked(endTrace).mock.calls)).toContain(
      'entryCount',
    );
  });
});
