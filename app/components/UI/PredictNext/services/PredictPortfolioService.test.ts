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
import {
  portfolioQueries,
  portfolioQueryFamilies,
} from '../queries/portfolioQueries';
import {
  type PredictAmount,
  type PredictEntityId,
  type PredictPortfolioSummary,
  type PredictSignedAmount,
  type PredictTimestamp,
  type PredictVenueId,
} from '../types';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
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
    PredictNextGetPortfolioSummary: 'PredictNext Get Portfolio Summary',
  },
  TraceOperation: { PredictDataFetch: 'predict.data_fetch' },
}));

const createPortfolio = (): jest.Mocked<VenuePortfolioAdapter> => ({
  fetchBalance: jest.fn(),
  fetchPositions: jest.fn(),
  fetchActivity: jest.fn(),
  fetchPortfolioSummary: jest.fn(),
});

const createSummary = (
  overrides: Partial<PredictPortfolioSummary> = {},
): PredictPortfolioSummary => ({
  venueId: KALSHI_VENUE_ID,
  currency: 'USD',
  availableBalance: '50.00' as PredictAmount,
  positionsValue: '24.40' as PredictAmount,
  claimableValue: '0' as PredictAmount,
  totalValue: '74.40' as PredictAmount,
  unrealizedPnl: '1.78' as PredictSignedAmount,
  asOf: '2026-10-23T12:00:05.120Z' as PredictTimestamp,
  complete: false,
  ...overrides,
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
    await expect(
      service.getPortfolioSummary('other' as PredictVenueId),
    ).rejects.toThrow('This prediction venue is not supported.');
    expect(portfolio.fetchPositions).not.toHaveBeenCalled();
    expect(portfolio.fetchActivity).not.toHaveBeenCalled();
    expect(portfolio.fetchPortfolioSummary).not.toHaveBeenCalled();
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
    expect(portfolioQueries.getPortfolioSummary(KALSHI_VENUE_ID)).toEqual({
      queryKey: [
        'PredictPortfolioService:getPortfolioSummary',
        KALSHI_VENUE_ID,
      ],
      family: ['PredictPortfolioService:getPortfolioSummary', KALSHI_VENUE_ID],
      staleTime: 30_000,
      scope: 'venue',
    });
  });

  it('invalidates the Summary family alongside the other portfolio reads', () => {
    const families = portfolioQueryFamilies(KALSHI_VENUE_ID);

    expect(families).toEqual([
      ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
      ['PredictPortfolioService:getPositions', KALSHI_VENUE_ID],
      ['PredictPortfolioService:getActivity', KALSHI_VENUE_ID],
      ['PredictPortfolioService:getPortfolioSummary', KALSHI_VENUE_ID],
    ]);
  });

  it('reads the Summary through the adapter and caches it', async () => {
    const portfolio = createPortfolio();
    const summary = createSummary();
    portfolio.fetchPortfolioSummary.mockResolvedValue(summary);
    const service = buildService(portfolio);

    const first = await service.getPortfolioSummary(KALSHI_VENUE_ID);
    const second = await service.getPortfolioSummary(KALSHI_VENUE_ID);

    expect(first).toEqual(summary);
    expect(second).toEqual(summary);
    expect(portfolio.fetchPortfolioSummary).toHaveBeenCalledTimes(1);
  });

  it('retries the Summary on its own policy without failing other reads', async () => {
    const portfolio = createPortfolio();
    portfolio.fetchPortfolioSummary.mockRejectedValue(
      PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE),
    );
    portfolio.fetchBalance.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      currency: 'USD',
      available: '50.00' as PredictAmount,
    });
    const service = buildService(portfolio);

    await expect(
      service.getPortfolioSummary(KALSHI_VENUE_ID),
    ).rejects.toMatchObject({ code: PredictErrorCode.VENUE_UNAVAILABLE });
    const balance = await service.getBalance(KALSHI_VENUE_ID);

    expect(portfolio.fetchPortfolioSummary).toHaveBeenCalledTimes(3);
    expect(balance.available).toBe('50.00');
  });

  it('traces the Summary with its completeness only, never amounts', async () => {
    const portfolio = createPortfolio();
    portfolio.fetchPortfolioSummary.mockResolvedValue(createSummary());
    const service = buildService(portfolio);

    await service.getPortfolioSummary(KALSHI_VENUE_ID);

    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetPortfolioSummary,
      id: expect.stringMatching(/^getPortfolioSummary-\d+$/u),
      data: { success: true, complete: false },
    });
    const traced = JSON.stringify([
      jest.mocked(trace).mock.calls,
      jest.mocked(endTrace).mock.calls,
    ]);
    expect(traced).not.toContain('74.40');
    expect(traced).not.toContain('24.40');
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

  describe('invalidateQueries', () => {
    const [balanceFamily, positionsFamily] =
      portfolioQueryFamilies(KALSHI_VENUE_ID);

    it('marks a cached read stale and refreshes it through its own query function', async () => {
      const portfolio = createPortfolio();
      portfolio.fetchBalance.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '100.00' as PredictAmount,
      });
      const service = buildService(portfolio);
      await service.getBalance(KALSHI_VENUE_ID);

      // A later read returns different data: the refresh must observe it.
      portfolio.fetchBalance.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '153.75' as PredictAmount,
      });
      await service.invalidateQueries({ queryKey: balanceFamily });

      // One initial read plus one refresh: the refresh only ran because the
      // invalidation marked the cache entry stale first.
      expect(portfolio.fetchBalance).toHaveBeenCalledTimes(2);
      const refreshed = await service.getBalance(KALSHI_VENUE_ID);
      expect(refreshed.available).toBe('153.75');
    });

    it('refreshes every cached page of a params-bearing read by family prefix', async () => {
      const portfolio = createPortfolio();
      portfolio.fetchPositions.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        positions: [],
        nextCursor: 'next-page',
      });
      const service = buildService(portfolio);
      await service.getPositions(KALSHI_VENUE_ID, { limit: 20 });
      await service.getPositions(KALSHI_VENUE_ID, { limit: 20 }, 'next-page');

      await service.invalidateQueries({ queryKey: positionsFamily });

      // The family invalidation refreshes the params-bearing cache entry —
      // one entry refetching all its pages — not just a canonical shape.
      expect(portfolio.fetchPositions).toHaveBeenCalledTimes(4);
      expect(portfolio.fetchPositions).toHaveBeenNthCalledWith(
        3,
        { limit: 20, cursor: undefined },
        expect.anything(),
      );
      expect(portfolio.fetchPositions).toHaveBeenNthCalledWith(
        4,
        { limit: 20, cursor: 'next-page' },
        expect.anything(),
      );
    });

    it('refreshes only the cached reads matching the key filters', async () => {
      const portfolio = createPortfolio();
      portfolio.fetchBalance.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '100.00' as PredictAmount,
      });
      portfolio.fetchPositions.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        positions: [],
      });
      const service = buildService(portfolio);
      await service.getBalance(KALSHI_VENUE_ID);
      await service.getPositions(KALSHI_VENUE_ID, { limit: 20 });

      await service.invalidateQueries({ queryKey: balanceFamily });

      expect(portfolio.fetchBalance).toHaveBeenCalledTimes(2);
      expect(portfolio.fetchPositions).toHaveBeenCalledTimes(1);
    });

    it('fetches nothing when the invalidated families have no cached entries', async () => {
      const portfolio = createPortfolio();
      const service = buildService(portfolio);

      await service.invalidateQueries({ queryKey: balanceFamily });
      // Keyless filters match everything; with an empty cache that is still
      // nothing.
      await service.invalidateQueries();

      expect(portfolio.fetchBalance).not.toHaveBeenCalled();
      expect(portfolio.fetchPositions).not.toHaveBeenCalled();
      expect(portfolio.fetchActivity).not.toHaveBeenCalled();
    });

    it('keyless invalidation refreshes every cached read, including Activity', async () => {
      const portfolio = createPortfolio();
      portfolio.fetchBalance.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '100.00' as PredictAmount,
      });
      portfolio.fetchActivity.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        activity: [],
      });
      const service = buildService(portfolio);
      await service.getBalance(KALSHI_VENUE_ID);
      await service.getActivity(KALSHI_VENUE_ID, { limit: 20 });

      await service.invalidateQueries();

      expect(portfolio.fetchBalance).toHaveBeenCalledTimes(2);
      expect(portfolio.fetchActivity).toHaveBeenCalledTimes(2);
    });

    it('exact-key invalidation refreshes only the exactly matching read', async () => {
      const portfolio = createPortfolio();
      portfolio.fetchBalance.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '100.00' as PredictAmount,
      });
      portfolio.fetchPositions.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        positions: [],
      });
      const service = buildService(portfolio);
      await service.getBalance(KALSHI_VENUE_ID);
      await service.getPositions(KALSHI_VENUE_ID, { limit: 20 });

      await service.invalidateQueries({
        queryKey: portfolioQueries.getPositions(KALSHI_VENUE_ID, {
          limit: 20,
        }).queryKey,
        exact: true,
      });

      expect(portfolio.fetchPositions).toHaveBeenCalledTimes(2);
      expect(portfolio.fetchBalance).toHaveBeenCalledTimes(1);
    });

    it('evicts the oldest cached read past the registry bound', async () => {
      const portfolio = createPortfolio();
      portfolio.fetchPositions.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        positions: [],
      });
      const service = buildService(portfolio);
      for (let limit = 1; limit <= 33; limit += 1) {
        await service.getPositions(KALSHI_VENUE_ID, { limit });
      }
      expect(portfolio.fetchPositions).toHaveBeenCalledTimes(33);

      // The oldest read (limit: 1) was evicted: its exact invalidation finds
      // no cached entry and refetches nothing.
      await service.invalidateQueries({
        queryKey: portfolioQueries.getPositions(KALSHI_VENUE_ID, { limit: 1 })
          .queryKey,
        exact: true,
      });
      expect(portfolio.fetchPositions).toHaveBeenCalledTimes(33);

      // The newest read survives and refreshes through its own query function.
      await service.invalidateQueries({
        queryKey: portfolioQueries.getPositions(KALSHI_VENUE_ID, { limit: 33 })
          .queryKey,
        exact: true,
      });
      expect(portfolio.fetchPositions).toHaveBeenCalledTimes(34);
    });

    it('keeps prior data and resolves when a refresh fails', async () => {
      const portfolio = createPortfolio();
      portfolio.fetchBalance.mockResolvedValueOnce({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '100.00' as PredictAmount,
      });
      // A non-retryable contract failure: the refresh attempt fails once
      // without exhausting the read's retries or opening its circuit.
      portfolio.fetchBalance.mockRejectedValue(
        PredictError.from(PredictErrorCode.INVALID_RESPONSE),
      );
      const service = buildService(portfolio);
      await service.getBalance(KALSHI_VENUE_ID);

      await expect(
        service.invalidateQueries({ queryKey: balanceFamily }),
      ).resolves.toBeUndefined();

      // The failed refresh stays stale: the next read refetches and recovers.
      portfolio.fetchBalance.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '153.75' as PredictAmount,
      });
      const recovered = await service.getBalance(KALSHI_VENUE_ID);
      expect(recovered.available).toBe('153.75');
    });
  });

  describe('clearAccountData', () => {
    it('aborts in-flight reads and never caches their late response', async () => {
      const portfolio = createPortfolio();
      let release: () => void = () => undefined;
      portfolio.fetchBalance.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = () =>
              resolve({
                venueId: KALSHI_VENUE_ID,
                currency: 'USD',
                available: '100.00' as PredictAmount,
              });
          }),
      );
      const service = buildService(portfolio);

      const read = service.getBalance(KALSHI_VENUE_ID);
      await Promise.resolve();
      await service.clearAccountData();
      // The caller fails instead of receiving the previous person's Balance.
      await expect(read).rejects.toThrow('CancelledError');

      // The response arrives after the purge: it must not be remembered.
      portfolio.fetchBalance.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '5.00' as PredictAmount,
      });
      release();
      await Promise.resolve();

      const next = await service.getBalance(KALSHI_VENUE_ID);
      expect(next.available).toBe('5.00');
      expect(portfolio.fetchBalance).toHaveBeenCalledTimes(2);
    });

    it('drops a cached read so the next read refetches it', async () => {
      const portfolio = createPortfolio();
      portfolio.fetchBalance.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '100.00' as PredictAmount,
      });
      const service = buildService(portfolio);
      await service.getBalance(KALSHI_VENUE_ID);
      // Inside the stale time the cache answers, so the venue is not called.
      await service.getBalance(KALSHI_VENUE_ID);
      expect(portfolio.fetchBalance).toHaveBeenCalledTimes(1);

      portfolio.fetchBalance.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '5.00' as PredictAmount,
      });
      await service.clearAccountData();

      const next = await service.getBalance(KALSHI_VENUE_ID);
      expect(next.available).toBe('5.00');
      expect(portfolio.fetchBalance).toHaveBeenCalledTimes(2);
    });

    it('stops refreshing the account reads it dropped', async () => {
      const portfolio = createPortfolio();
      portfolio.fetchBalance.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        currency: 'USD',
        available: '100.00' as PredictAmount,
      });
      portfolio.fetchPositions.mockResolvedValue({
        venueId: KALSHI_VENUE_ID,
        positions: [],
      });
      const service = buildService(portfolio);
      await service.getBalance(KALSHI_VENUE_ID);
      await service.getPositions(KALSHI_VENUE_ID, { limit: 20 });

      await service.clearAccountData();
      // An abandoned Order's terminal receipt still invalidates by family;
      // the dropped reads must not be re-read for the previous person.
      await service.invalidateQueries();

      expect(portfolio.fetchBalance).toHaveBeenCalledTimes(1);
      expect(portfolio.fetchPositions).toHaveBeenCalledTimes(1);
    });
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
          status: 'open' as const,
          shares: '75.00' as PredictAmount,
          currentValue: '41.25' as PredictAmount,
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
          side: 'yes' as const,
          shares: '41.50' as PredictAmount,
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
