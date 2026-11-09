import { hashKey } from '@tanstack/query-core';
import type { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import {
  buildPredictNextIntegrationHarness as createPredictNextIntegrationHarness,
  routePredictApi,
} from '../../../../../tests/integration/harnesses/predict-next';
import missingQuote from '../contracts/v1/fixtures/portfolio-contract/missing-quote.json';
import multiPageHoldings from '../contracts/v1/fixtures/portfolio-contract/multi-page-holdings.json';
import sellBuyAndSettlement from '../contracts/v1/fixtures/portfolio-contract/sell-buy-and-settlement.json';
import { PredictErrorCode } from '../errors';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';

const POSITIONS_PATH = '/v1/venues/kalshi/positions';
const SUMMARY_PATH = '/v1/venues/kalshi/portfolio/summary';
const ACTIVITY_PATH = '/v1/venues/kalshi/activity';

const position = {
  venueId: 'kalshi',
  marketId: 'KXNBAGAME-26MAY12-LALBOS-LAL',
  side: 'yes',
  status: 'open',
  shares: '75.00',
  averagePrice: '0.55',
  costBasis: '41.25',
  currentValue: '45.00',
  unrealizedPnl: '3.75',
  unrealizedPnlPercent: '9.09',
  context: {
    eventId: 'KXNBAGAME-26MAY12-LALBOS',
    eventTitle: 'Lakers vs Celtics',
    marketQuestion: 'Will the Lakers win?',
    outcomeLabel: 'Lakers',
  },
};

const trade = {
  type: 'trade',
  id: '0199e2b4-1f0d-7c55-8a10-6b7c8d9e0f1a',
  venueId: 'kalshi',
  marketId: 'KXNBAGAME-26MAY12-LALBOS-LAL',
  side: 'yes',
  action: 'buy',
  shares: '75.00',
  price: '0.55',
  amount: '41.35',
  fee: '0.10',
  timestamp: '2026-09-01T12:00:00.000Z',
  context: {
    eventId: 'KXNBAGAME-26MAY12-LALBOS',
    eventTitle: 'Lakers vs Celtics',
    marketQuestion: 'Will the Lakers win?',
    outcomeLabel: 'Lakers',
  },
};

const settlement = {
  type: 'settlement',
  id: 'settlement-KXNBAGAME-20MAY01-LALBOS-LAL-yes',
  venueId: 'kalshi',
  marketId: 'KXNBAGAME-20MAY01-LALBOS-LAL',
  side: 'yes',
  shares: '10.00',
  result: 'yes',
  proceeds: '10.00',
  realizedPnl: '4.80',
  timestamp: '2026-05-21T00:00:00.000Z',
  context: {
    eventId: 'KXNBAGAME-20MAY01-LALBOS',
    eventTitle: 'Lakers vs Celtics',
    marketQuestion: 'Will the Lakers win?',
    outcomeLabel: 'Lakers',
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
              activity: [trade, settlement],
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

    expect(result.activity).toEqual([trade, settlement]);
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
          activity: isSecondPage ? [settlement] : [trade],
          nextCursor: isSecondPage ? undefined : 'next-page',
        },
      };
    });

    const firstPage = await harness.messenger.call(
      'PredictPortfolioService:getActivity',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
    expect(firstPage.activity).toEqual([trade]);

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

  describe('C1 contract fixtures', () => {
    it('pages the C1 holdings by status and newest first, then reads the Summary', async () => {
      const harness = buildPredictNextIntegrationHarness(
        routePredictApi({
          [POSITIONS_PATH]: (url) => ({
            body: url.searchParams.get('cursor')
              ? multiPageHoldings.secondPage
              : multiPageHoldings.firstPage,
          }),
          [SUMMARY_PATH]: { body: multiPageHoldings.summary },
        }),
      );

      const firstPage = await harness.messenger.call(
        'PredictPortfolioService:getPositions',
        KALSHI_VENUE_ID,
        { limit: 2 },
      );
      const secondPage = await harness.messenger.call(
        'PredictPortfolioService:getPositions',
        KALSHI_VENUE_ID,
        { limit: 2 },
        firstPage.nextCursor,
      );
      const summary = await harness.messenger.call(
        'PredictPortfolioService:getPortfolioSummary',
        KALSHI_VENUE_ID,
      );

      expect(
        [...firstPage.positions, ...secondPage.positions].map(
          ({ marketId, status }) => `${status}:${marketId}`,
        ),
      ).toEqual([
        'open:KXNFLGAME-26OCT25KCBUF-KC',
        'open:KXNCAAFGAME-25OCT25PSUOSU-PSU',
        'settled:KXNFLGAME-19OCT25LVKC-KC',
      ]);
      expect(secondPage.nextCursor).toBeUndefined();
      expect(summary).toEqual(multiPageHoldings.summary);
      expect(harness.fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
        'https://predict.example/v1/venues/kalshi/positions?limit=2',
        'https://predict.example/v1/venues/kalshi/positions?limit=2&cursor=opaque-positions-cursor',
        'https://predict.example/v1/venues/kalshi/portfolio/summary',
      ]);
    });

    it('reads the top open Positions by value as one unpaginated page', async () => {
      const harness = buildPredictNextIntegrationHarness(
        routePredictApi({
          [POSITIONS_PATH]: { body: multiPageHoldings.topByValue },
        }),
      );

      const result = await harness.messenger.call(
        'PredictPortfolioService:getPositions',
        KALSHI_VENUE_ID,
        { limit: 3, status: ['open'], sort: 'value' },
      );

      expect(result).toEqual(multiPageHoldings.topByValue);
      expect(String(harness.fetchMock.mock.calls[0][0])).toBe(
        'https://predict.example/v1/venues/kalshi/positions?limit=3&sort=value&status=open',
      );
    });

    it('keeps an unquoted Position valueless and the Summary flagged incomplete', async () => {
      const harness = buildPredictNextIntegrationHarness(
        routePredictApi({
          [POSITIONS_PATH]: { body: missingQuote.positions },
          [SUMMARY_PATH]: { body: missingQuote.summary },
        }),
      );

      const page = await harness.messenger.call(
        'PredictPortfolioService:getPositions',
        KALSHI_VENUE_ID,
        { limit: 20 },
      );
      const summary = await harness.messenger.call(
        'PredictPortfolioService:getPortfolioSummary',
        KALSHI_VENUE_ID,
      );

      const unquoted = page.positions[1];
      expect(unquoted.costBasis).toBe('2.17');
      expect(unquoted.currentValue).toBeUndefined();
      expect(unquoted.unrealizedPnl).toBeUndefined();
      expect(summary.complete).toBe(false);
      expect(summary.totalValue).toBe('74.40');
    });

    it('serves the C1 trades and Settlement in the pinned order with the archive horizon', async () => {
      const horizon = '2026-08-27T00:00:00.000Z';
      const harness = buildPredictNextIntegrationHarness(
        routePredictApi({
          [ACTIVITY_PATH]: {
            body: {
              ...sellBuyAndSettlement.activity,
              settlementsCompleteFrom: horizon,
            },
          },
        }),
      );

      const page = await harness.messenger.call(
        'PredictPortfolioService:getActivity',
        KALSHI_VENUE_ID,
        { limit: 20 },
      );

      expect(
        page.activity.map((entry) =>
          entry.type === 'trade' ? `trade:${entry.action}` : entry.type,
        ),
      ).toEqual(['trade:sell', 'settlement', 'trade:buy']);
      expect(page.settlementsCompleteFrom).toBe(horizon);
      expect(page.nextCursor).toBe('opaque-activity-cursor');
    });

    it('rejects a misordered Activity page without retrying it', async () => {
      const [sell, settledEntry, buy] = sellBuyAndSettlement.activity.activity;
      const harness = buildPredictNextIntegrationHarness(
        routePredictApi({
          [ACTIVITY_PATH]: {
            body: { venueId: 'kalshi', activity: [buy, settledEntry, sell] },
          },
        }),
      );

      const result = harness.messenger.call(
        'PredictPortfolioService:getActivity',
        KALSHI_VENUE_ID,
        { limit: 20 },
      );

      await expect(result).rejects.toMatchObject({
        code: PredictErrorCode.INVALID_RESPONSE,
      });
      expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects a Summary whose total is not the sum of its parts', async () => {
      const harness = buildPredictNextIntegrationHarness(
        routePredictApi({
          [SUMMARY_PATH]: {
            body: { ...multiPageHoldings.summary, totalValue: '153.49' },
          },
        }),
      );

      const result = harness.messenger.call(
        'PredictPortfolioService:getPortfolioSummary',
        KALSHI_VENUE_ID,
      );

      await expect(result).rejects.toMatchObject({
        code: PredictErrorCode.INVALID_RESPONSE,
      });
    });

    it('refreshes a cached Summary when its family is invalidated', async () => {
      let summaryBody: unknown = missingQuote.summary;
      const harness = buildPredictNextIntegrationHarness(
        routePredictApi({ [SUMMARY_PATH]: () => ({ body: summaryBody }) }),
      );
      await harness.messenger.call(
        'PredictPortfolioService:getPortfolioSummary',
        KALSHI_VENUE_ID,
      );
      summaryBody = multiPageHoldings.summary;

      await harness.portfolioService.invalidateQueries({
        queryKey: portfolioQueryFamilies(KALSHI_VENUE_ID)[3],
      });
      const summary = await harness.messenger.call(
        'PredictPortfolioService:getPortfolioSummary',
        KALSHI_VENUE_ID,
      );

      expect(summary).toEqual(multiPageHoldings.summary);
      expect(harness.fetchMock).toHaveBeenCalledTimes(2);
    });
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
      // `Date.now` is a suite-wide mock in the test setup: restore its value
      // rather than the (non-existent) real implementation, which would leave
      // the clock undefined for every later test in this file.
      dateNow.mockReturnValue(123);

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

  describe('platform reset', () => {
    /** Real-timer poll so cancelled reads and their late responses settle. */
    const until = async (
      condition: () => boolean,
      timeoutMs = 1_000,
    ): Promise<void> => {
      const deadline = Date.now() + timeoutMs;
      while (!condition()) {
        if (Date.now() > deadline) {
          throw new Error('Timed out waiting for the reads to settle');
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

    /** A response the test releases when it wants the read to settle. */
    const defer = () => {
      let release: (result: { body: unknown }) => void = () => undefined;
      const promise = new Promise<{ body: unknown }>((resolve) => {
        release = resolve;
      });
      return { promise, release: (body: unknown) => release({ body }) };
    };

    const callsTo = (
      harness: ReturnType<typeof createPredictNextIntegrationHarness>,
      path: string,
    ): number =>
      harness.fetchMock.mock.calls.filter(([url]) => String(url).includes(path))
        .length;

    it('cancels in-flight reads and discards their late responses', async () => {
      const balance = defer();
      const positions = defer();
      const activity = defer();
      const harness = buildPredictNextIntegrationHarness((url) => {
        if (String(url).endsWith('/balance')) {
          return balance.promise;
        }
        if (String(url).includes('/positions')) {
          return positions.promise;
        }
        if (String(url).includes('/activity')) {
          return activity.promise;
        }
        return { status: 404 };
      });
      const updates: DataServiceGranularCacheUpdatedPayload[] = [];
      [
        ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
        [
          'PredictPortfolioService:getPositions',
          KALSHI_VENUE_ID,
          { limit: 20 },
        ],
        ['PredictPortfolioService:getActivity', KALSHI_VENUE_ID, { limit: 20 }],
      ].forEach((queryKey) =>
        harness.messenger.subscribe(
          `PredictPortfolioService:cacheUpdated:${hashKey(queryKey)}`,
          (payload) => updates.push(payload),
        ),
      );

      const reads = [
        harness.messenger.call(
          'PredictPortfolioService:getBalance',
          KALSHI_VENUE_ID,
        ),
        harness.messenger.call(
          'PredictPortfolioService:getPositions',
          KALSHI_VENUE_ID,
          { limit: 20 },
        ),
        harness.messenger.call(
          'PredictPortfolioService:getActivity',
          KALSHI_VENUE_ID,
          { limit: 20 },
        ),
      ];
      await until(() => callsTo(harness, '/activity') === 1);
      expect(harness.fetchMock).toHaveBeenCalledTimes(3);

      // The platform reset runs while all three reads are in flight.
      await harness.portfolioService.clearAccountData();

      // Their callers fail rather than receive the previous person's data.
      const settled = await Promise.allSettled(reads);
      expect(settled.map((result) => result.status)).toEqual([
        'rejected',
        'rejected',
        'rejected',
      ]);

      // The previous person's responses arrive afterwards: they never reach
      // the cache or the updates a UI query client hydrates from.
      const publishedBefore = updates.length;
      balance.release({
        venueId: 'kalshi',
        currency: 'USD',
        available: '100.00',
      });
      positions.release({ venueId: 'kalshi', positions: [position] });
      activity.release({ venueId: 'kalshi', activity: [trade] });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const late = updates.slice(publishedBefore);
      expect(JSON.stringify(late)).not.toContain('100.00');
      expect(JSON.stringify(late)).not.toContain('LAL');
      // The cancelled reads made no further request.
      expect(harness.fetchMock).toHaveBeenCalledTimes(3);
    });

    it('refetches a cached Balance that is still inside its stale time', async () => {
      let available = '100.00';
      const harness = buildPredictNextIntegrationHarness((url) =>
        String(url).endsWith('/balance')
          ? { body: { venueId: 'kalshi', currency: 'USD', available } }
          : { status: 404 },
      );
      const updates = collectCacheUpdates(
        harness,
        hashKey(['PredictPortfolioService:getBalance', KALSHI_VENUE_ID]),
      );

      await expect(
        harness.messenger.call(
          'PredictPortfolioService:getBalance',
          KALSHI_VENUE_ID,
        ),
      ).resolves.toMatchObject({ available: '100.00' });
      // A second read inside the stale time is served from the cache, so the
      // venue is not called again.
      await harness.messenger.call(
        'PredictPortfolioService:getBalance',
        KALSHI_VENUE_ID,
      );
      expect(callsTo(harness, '/balance')).toBe(1);

      available = '5.00';
      await harness.portfolioService.clearAccountData();

      // The purge removes the entry rather than leaving it stale: a stale
      // entry keeps its data and republishes it on the next fetch, which would
      // hydrate the previous person's Balance into a cleared UI cache.
      expect(updates[updates.length - 1]).toMatchObject({
        type: 'removed',
        state: null,
      });

      // The next read refetches instead of handing back the previous
      // person's Balance.
      await expect(
        harness.messenger.call(
          'PredictPortfolioService:getBalance',
          KALSHI_VENUE_ID,
        ),
      ).resolves.toMatchObject({ available: '5.00' });
      expect(callsTo(harness, '/balance')).toBe(2);
    });
  });
});
