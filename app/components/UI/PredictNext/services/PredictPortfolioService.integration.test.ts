import { hashKey } from '@tanstack/query-core';
import type { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import { buildPredictNextIntegrationHarness as createPredictNextIntegrationHarness } from '../../../../../tests/integration/harnesses/predict-next';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import { KALSHI_VENUE_ID } from '../types';

const position = {
  venueId: 'kalshi',
  marketId: 'KXNBAGAME-26MAY12-LALBOS-LAL',
  side: 'yes',
  shares: '75.00',
  marketExposure: '41.25',
  realizedPnl: '-2.50',
  feesPaid: '0.14',
  totalTraded: '41.25',
  updatedAt: '2026-09-01T12:00:00.000Z',
  context: {
    eventId: 'KXNBAGAME-26MAY12-LALBOS',
    eventTitle: 'Lakers vs Celtics',
    marketQuestion: 'Will the Lakers win?',
    outcomeId: 'KXNBAGAME-26MAY12-LALBOS-LAL-YES',
    outcomeLabel: 'Lakers',
  },
};

const fill = {
  type: 'fill',
  id: 'fill-1',
  venueId: 'kalshi',
  marketId: 'KXNBAGAME-26MAY12-LALBOS-LAL',
  outcomeSide: 'yes',
  shares: '75.00',
  price: '0.55',
  fee: '0.10',
  timestamp: '2026-09-01T12:00:00.000Z',
  context: {
    eventId: 'KXNBAGAME-26MAY12-LALBOS',
    eventTitle: 'Lakers vs Celtics',
    marketQuestion: 'Will the Lakers win?',
  },
};

const settlement = {
  type: 'settlement',
  id: 'KXNBAGAME-20MAY01-LALBOS-LAL:2026-05-21T00:00:00.000Z',
  venueId: 'kalshi',
  marketId: 'KXNBAGAME-20MAY01-LALBOS-LAL',
  result: 'yes',
  side: 'yes',
  shares: '10.00',
  proceeds: '10.00',
  costBasis: '5.20',
  timestamp: '2026-05-21T00:00:00.000Z',
  context: {
    eventId: 'KXNBAGAME-20MAY01-LALBOS',
    eventTitle: 'Lakers vs Celtics',
    marketQuestion: 'Will the Lakers win?',
  },
};

describe('PredictNext account-scoped Portfolio reads', () => {
  const harnesses: ReturnType<typeof createPredictNextIntegrationHarness>[] =
    [];
  const buildPredictNextIntegrationHarness = (
    ...args: Parameters<typeof createPredictNextIntegrationHarness>
  ) => {
    const harness = createPredictNextIntegrationHarness(...args);
    harnesses.push(harness);
    return harness;
  };

  afterEach(() => {
    harnesses.splice(0).forEach((harness) => harness.destroy());
  });

  it('reads Positions through the authenticated service-to-transport chain', async () => {
    const harness = buildPredictNextIntegrationHarness((url) =>
      String(url).includes('/venues/kalshi/positions')
        ? { body: { venueId: 'kalshi', positions: [position] } }
        : { status: 404 },
    );

    const result = await harness.messenger.call(
      'PredictPortfolioService:getPositions',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );

    expect(result.positions).toEqual([position]);
    expect(harness.getBearerTokenMock).toHaveBeenCalledTimes(1);
    expect(harness.fetchMock).toHaveBeenCalledWith(
      'https://predict.example/v1/venues/kalshi/positions?limit=20',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-bearer-token',
        }),
      }),
    );
  });

  it('reads Activity through the authenticated service-to-transport chain', async () => {
    const harness = buildPredictNextIntegrationHarness((url) =>
      String(url).includes('/venues/kalshi/activity')
        ? {
            body: {
              venueId: 'kalshi',
              activity: [fill, settlement],
              nextCursor: 'next-page',
            },
          }
        : { status: 404 },
    );

    const result = await harness.messenger.call(
      'PredictPortfolioService:getActivity',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );

    expect(result.activity).toEqual([fill, settlement]);
    expect(result.nextCursor).toBe('next-page');
    expect(harness.fetchMock).toHaveBeenCalledWith(
      'https://predict.example/v1/venues/kalshi/activity?limit=20',
      expect.anything(),
    );
  });

  it('requests the next Activity page with the upstream cursor', async () => {
    const harness = buildPredictNextIntegrationHarness((url) => {
      if (!String(url).includes('/venues/kalshi/activity')) {
        return { status: 404 };
      }
      const isSecondPage = String(url).includes('cursor=next-page');

      return {
        body: {
          venueId: 'kalshi',
          activity: isSecondPage ? [settlement] : [fill],
          nextCursor: isSecondPage ? undefined : 'next-page',
        },
      };
    });

    const firstPage = await harness.messenger.call(
      'PredictPortfolioService:getActivity',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
    expect(firstPage.activity).toEqual([fill]);

    const secondPage = await harness.messenger.call(
      'PredictPortfolioService:getActivity',
      KALSHI_VENUE_ID,
      { limit: 20 },
      'next-page',
    );

    expect(secondPage.activity).toEqual([settlement]);
    expect(harness.fetchMock).toHaveBeenLastCalledWith(
      'https://predict.example/v1/venues/kalshi/activity?limit=20&cursor=next-page',
      expect.anything(),
    );
  });

  it('keeps Positions working when Activity failures exhaust their own policy', async () => {
    const harness = buildPredictNextIntegrationHarness((url) =>
      String(url).includes('/venues/kalshi/activity')
        ? { status: 503 }
        : { body: { venueId: 'kalshi', positions: [position] } },
    );

    await expect(
      harness.messenger.call(
        'PredictPortfolioService:getActivity',
        KALSHI_VENUE_ID,
        { limit: 20 },
      ),
    ).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    expect(harness.fetchMock).toHaveBeenCalledTimes(3);

    // Reads retry independently: the exhausted Activity read does not open a
    // shared circuit, so Positions still executes and loads.
    const result = await harness.messenger.call(
      'PredictPortfolioService:getPositions',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
    expect(result.positions).toEqual([position]);
    expect(harness.fetchMock).toHaveBeenCalledTimes(4);
  });

  it('maps a rejected Positions request to UNAUTHENTICATED without retrying', async () => {
    const harness = buildPredictNextIntegrationHarness(() => ({ status: 401 }));

    await expect(
      harness.messenger.call(
        'PredictPortfolioService:getPositions',
        KALSHI_VENUE_ID,
        { limit: 20 },
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a response contract failure', async () => {
    const harness = buildPredictNextIntegrationHarness((url) =>
      String(url).includes('/venues/kalshi/positions')
        ? { body: { venueId: 'kalshi', positions: [{ marketId: 'market-1' }] } }
        : { status: 404 },
    );

    await expect(
      harness.messenger.call(
        'PredictPortfolioService:getPositions',
        KALSHI_VENUE_ID,
        { limit: 20 },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
  });

  describe('invalidation', () => {
    const positionsHash = hashKey([
      'PredictPortfolioService:getPositions',
      KALSHI_VENUE_ID,
      { limit: 20 },
    ]);
    const [, positionsFamily] = portfolioQueryFamilies(KALSHI_VENUE_ID);
    /** Real-timer poll so fire-and-forget cache updates can settle without
     * assuming microtask timing. */
    const until = async (
      condition: () => boolean,
      timeoutMs = 1_000,
    ): Promise<void> => {
      const deadline = Date.now() + timeoutMs;
      while (!condition()) {
        if (Date.now() > deadline) {
          throw new Error('Timed out waiting for the cache update');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };

    /** Collects the granular cache updates published for one query hash. */
    const collectCacheUpdates = (
      harness: ReturnType<typeof createPredictNextIntegrationHarness>,
      hash: string,
    ): DataServiceGranularCacheUpdatedPayload[] => {
      const updates: DataServiceGranularCacheUpdatedPayload[] = [];
      harness.messenger.subscribe(
        `PredictPortfolioService:cacheUpdated:${hash}`,
        (payload) => updates.push(payload),
      );
      return updates;
    };

    /** Waits until the latest cache update carries the given body fragment:
     * the invalidation dispatch itself also publishes (with the stale
     * data), and notifications flush asynchronously, so event counts
     * cannot identify the refresh. */
    const untilCacheCarries = async (
      updates: DataServiceGranularCacheUpdatedPayload[],
      fragment: string,
    ): Promise<void> =>
      until(() =>
        JSON.stringify(updates[updates.length - 1]?.state ?? {}).includes(
          fragment,
        ),
      );

    it('republishes fresh reads after invalidateQueries', async () => {
      let positionsBody: unknown = {
        venueId: 'kalshi',
        positions: [position],
      };
      const harness = buildPredictNextIntegrationHarness((url) =>
        String(url).includes('/venues/kalshi/positions')
          ? { body: positionsBody }
          : { status: 404 },
      );

      // Cache listeners see the pre-trade snapshot from the populate read.
      const updates = collectCacheUpdates(harness, positionsHash);

      const dateNow = jest.spyOn(Date, 'now');
      dateNow.mockReturnValue(1_000);
      await harness.messenger.call(
        'PredictPortfolioService:getPositions',
        KALSHI_VENUE_ID,
        { limit: 20 },
      );
      const firstSnapshot = updates[0]?.state?.queries[0]?.state;

      // The venue now reports a changed Position list: the invalidation
      // refetch must observe it and publish it to cache listeners.
      positionsBody = {
        venueId: 'kalshi',
        positions: [{ ...position, shares: '37.50' }],
      };
      // A later wall clock stamps the refresh's dataUpdatedAt: the UI cache
      // hydrates a service snapshot only when it is strictly newer.
      dateNow.mockReturnValue(61_000);

      await harness.messenger.call(
        'PredictPortfolioService:invalidateQueries',
        { queryKey: positionsFamily },
      );
      dateNow.mockRestore();

      await untilCacheCarries(updates, '37.50');
      const latest = updates[updates.length - 1];
      expect(latest.type).toBe('updated');
      expect(latest.state?.queries[0]?.queryHash).toBe(positionsHash);
      expect(latest.state?.queries[0]?.state.data).toMatchObject({
        pages: [{ positions: [{ shares: '37.50' }] }],
      });
      // Newer dataUpdatedAt is the property the UI cache's newer-data
      // hydration applies: without it the mounted reads never update.
      expect(latest.state?.queries[0]?.state.dataUpdatedAt).toBeGreaterThan(
        firstSnapshot?.dataUpdatedAt ?? 0,
      );
    });

    it('does not fetch families with no cached entries', async () => {
      const harness = buildPredictNextIntegrationHarness((url) =>
        String(url).includes('/venues/kalshi/positions')
          ? { body: { venueId: 'kalshi', positions: [] } }
          : { status: 404 },
      );

      await harness.messenger.call(
        'PredictPortfolioService:invalidateQueries',
        { queryKey: positionsFamily },
      );
      // Keyless filters match every read; with an empty cache that is
      // still nothing.
      await harness.messenger.call(
        'PredictPortfolioService:invalidateQueries',
        {},
      );

      expect(harness.fetchMock).not.toHaveBeenCalled();
    });
  });
});
