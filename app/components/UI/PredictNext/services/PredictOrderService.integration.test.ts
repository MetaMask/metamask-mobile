import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import { hashKey } from '@tanstack/query-core';
import { buildPredictNextIntegrationHarness as createPredictNextIntegrationHarness } from '../../../../../tests/integration/harnesses/predict-next';
import { getPredictOrderServiceMessenger } from '../../../../core/Engine/messengers/predict-order-service-messenger';
import {
  MISSING_OPERATION_EXPIRY_GRACE_MS,
  PREDICT_ORDER_SERVICE_NAME,
  PredictOrderService,
} from '../services/PredictOrderService';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import type { RootState } from '../../../../reducers';
import type { PredictConfig } from '../config/predictConfig';
import { subscribeToActiveVenueChanges } from '../implementation/subscribeToActiveVenueChanges';
import type { PredictConfiguredVenue } from '../implementation/types';
import type { PredictOrderServiceOrderResolvedEvent } from './PredictOrderService';

const previewResponse = {
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  requestedAmount: '20.00',
  orderAmount: '19.07',
  estimatedContracts: 41,
  averagePrice: '0.4651',
  limitPrice: '0.4651',
  fee: '0.82',
  feeBreakdown: [
    { source: 'venue', amount: '0.41' },
    { source: 'metamask', amount: '0.41' },
  ],
  totalDebit: '19.89',
  potentialPayout: '41.00',
  potentialProfit: '21.11',
  expiresAt: '2026-03-01T12:00:30.000Z',
};

const sellPreviewResponse = {
  previewId: 'c4d5e6f0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  action: 'sell',
  requestedContracts: 70,
  estimatedContracts: 65,
  averagePrice: '0.4800',
  limitPrice: '0.4000',
  fee: '0.31',
  feeBreakdown: [
    { source: 'venue', amount: '0.16' },
    { source: 'metamask', amount: '0.15' },
  ],
  estimatedProceeds: '31.20',
  estimatedNetProceeds: '30.89',
  expiresAt: '2026-03-01T12:00:30.000Z',
};

const sellReceiptResponse = {
  operationId: 'e5f6a7b1-2222-4333-9444-555566667777',
  previewId: 'c4d5e6f0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  action: 'sell',
  status: 'filled',
  quotedContracts: 65,
  venueOrderId: 'venue-order-2',
  filledContracts: '65.00',
  averageFillPrice: '0.4800',
  fee: '0.31',
  actualProceeds: '31.20',
  netProceeds: '30.89',
};

const buyReceiptResponse = {
  operationId: 'a1b2c3d4-3333-4444-8555-666677778888',
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  action: 'buy',
  status: 'filled',
  requestedMaxSpend: '20.00',
  quotedContracts: 43,
  venueOrderId: 'venue-order-1',
  filledContracts: '43.00',
  averageFillPrice: '0.4651',
  fee: '0.86',
  actualSpend: '20.86',
  payoutExposure: '43.00',
};

/** A canonical open Position the venue reports for the portfolio reads. */
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

/** The signed Commit POST: `/orders/{previewId}/commit`. */
const isCommitUrl = (url: unknown): boolean =>
  /\/orders\/[^/]+\/commit$/u.test(String(url));
/** The receipt read that observes it: `GET /orders/{previewId}`. */
const isObserveUrl = (url: unknown): boolean =>
  /\/orders\/[^/]+$/u.test(String(url)) &&
  !String(url).endsWith('/orders/preview');
/** The Preview reference a commit or observe URL names. */
const previewIdOf = (url: unknown): string =>
  /\/orders\/([^/]+)(?:\/commit)?$/u.exec(String(url))?.[1] ?? '';

describe('PredictNext Order Preview request', () => {
  const harnesses: ReturnType<typeof createPredictNextIntegrationHarness>[] =
    [];
  const buildPredictNextIntegrationHarness = (
    ...args: Parameters<typeof createPredictNextIntegrationHarness>
  ) => {
    const harness = createPredictNextIntegrationHarness(...args);
    harnesses.push(harness);
    return harness;
  };

  /** Real-timer poll so the fire-and-forget post-receipt cache refresh can
   * settle without assuming microtask timing. */
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

  /** Collects the granular cache updates published for one query hash —
   * the payloads a UI query client hydrates its cache from. */
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
   * the invalidation dispatch itself also publishes (with the stale data),
   * so event counts cannot distinguish the refresh. */
  const untilCacheCarries = async (
    updates: DataServiceGranularCacheUpdatedPayload[],
    fragment: string,
  ): Promise<void> =>
    until(() =>
      JSON.stringify(updates[updates.length - 1]?.state ?? {}).includes(
        fragment,
      ),
    );

  afterEach(() => {
    jest.restoreAllMocks();
    harnesses.splice(0).forEach((harness) => harness.destroy());
  });

  const buildService = (
    harness: ReturnType<typeof createPredictNextIntegrationHarness>,
  ) => {
    const rootMessenger = new Messenger<MockAnyNamespace, never, never>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const messenger = new Messenger({
      namespace: PREDICT_ORDER_SERVICE_NAME,
      parent: rootMessenger,
    });
    return new PredictOrderService({
      messenger,
      trading: harness.adapter.trading,
      venueId: harness.adapter.venueId,
    });
  };

  /** Quotes the buy fixture: a Commit is only sent for a Preview the
   * service quoted for the current Predict User. */
  const quoteBuy = async (orderService: PredictOrderService) => {
    const preview = await orderService.requestQuote(KALSHI_VENUE_ID, {
      marketId: 'KXTEST-26-A' as never,
      side: 'yes',
      action: 'buy',
      amount: '20.00' as never,
      idempotencyKey: previewResponse.previewId,
    });
    await orderService.reviewPreview(KALSHI_VENUE_ID, preview.previewId);
    return preview;
  };

  const quoteSell = async (orderService: PredictOrderService) => {
    const preview = await orderService.requestQuote(KALSHI_VENUE_ID, {
      marketId: 'KXTEST-26-A' as never,
      side: 'yes',
      action: 'sell',
      contracts: '70' as never,
      idempotencyKey: sellPreviewResponse.previewId,
    });
    await orderService.reviewPreview(KALSHI_VENUE_ID, preview.previewId);
    return preview;
  };

  /** The exact bodies POSTed to the commit route, in send order. */
  const commitBodies = (
    harness: ReturnType<typeof createPredictNextIntegrationHarness>,
  ): unknown[] =>
    harness.fetchMock.mock.calls
      .filter(([url]) => isCommitUrl(url))
      .map(([, init]) => JSON.parse(String(init?.body)));

  it('requests a Preview through the authenticated transport chain', async () => {
    const harness = buildPredictNextIntegrationHarness((url, init) =>
      String(url).endsWith('/v1/venues/kalshi/orders/preview') &&
      init?.method === 'POST'
        ? { body: previewResponse }
        : { status: 404 },
    );

    const result = await buildService(harness).requestQuote(KALSHI_VENUE_ID, {
      marketId: 'KXTEST-26-A' as never,
      side: 'yes',
      action: 'buy',
      amount: '20.00' as never,
      idempotencyKey: previewResponse.previewId,
    });

    expect(result.previewId).toBe(previewResponse.previewId);
    expect(result).toMatchObject({ totalDebit: '19.89' });
    expect(result.feeBreakdown).toEqual(previewResponse.feeBreakdown);
    expect(harness.getBearerTokenMock).toHaveBeenCalledTimes(1);
    expect(harness.fetchMock).toHaveBeenCalledWith(
      'https://predict.example/v1/venues/kalshi/orders/preview',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-bearer-token',
          'Content-Type': 'application/json',
        }),
        // The key rides the preview body: it becomes the Order's
        // `client_order_id`, so a re-quote reuses one idempotent operation.
        body: JSON.stringify({
          marketId: 'KXTEST-26-A',
          side: 'yes',
          amount: '20.00',
          idempotencyKey: previewResponse.previewId,
        }),
      }),
    );
  });

  it('surfaces canonical backend failure codes as Predict errors', async () => {
    const harness = buildPredictNextIntegrationHarness((url, init) =>
      String(url).endsWith('/orders/preview') && init?.method === 'POST'
        ? {
            status: 422,
            body: {
              code: 'insufficient_balance',
              message: 'Estimated total debit exceeds the available balance.',
            },
          }
        : { status: 404 },
    );

    await expect(
      buildService(harness).requestQuote(KALSHI_VENUE_ID, {
        marketId: 'KXTEST-26-A' as never,
        side: 'yes',
        action: 'buy',
        amount: '999.00' as never,
        idempotencyKey: previewResponse.previewId,
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
  });

  it('fails runtime validation when the Preview shape is malformed', async () => {
    const harness = buildPredictNextIntegrationHarness((url, init) =>
      String(url).endsWith('/orders/preview') && init?.method === 'POST'
        ? {
            body: {
              ...previewResponse,
              estimatedContracts: 0,
            },
          }
        : { status: 404 },
    );

    await expect(
      buildService(harness).requestQuote(KALSHI_VENUE_ID, {
        marketId: 'KXTEST-26-A' as never,
        side: 'yes',
        action: 'buy',
        amount: '20.00' as never,
        idempotencyKey: previewResponse.previewId,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('binds the venue: a mismatched Preview fails validation', async () => {
    const harness = buildPredictNextIntegrationHarness((url, init) =>
      String(url).endsWith('/orders/preview') && init?.method === 'POST'
        ? {
            body: { ...previewResponse, venueId: 'polymarket' },
          }
        : { status: 404 },
    );

    await expect(
      buildService(harness).requestQuote(KALSHI_VENUE_ID, {
        marketId: 'KXTEST-26-A' as never,
        side: 'yes',
        action: 'buy',
        amount: '20.00' as never,
        idempotencyKey: previewResponse.previewId,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('binds the requested amount: a mismatched echo fails validation', async () => {
    const harness = buildPredictNextIntegrationHarness((url, init) =>
      String(url).endsWith('/orders/preview') && init?.method === 'POST'
        ? {
            body: { ...previewResponse, requestedAmount: '50.00' },
          }
        : { status: 404 },
    );

    await expect(
      buildService(harness).requestQuote(KALSHI_VENUE_ID, {
        marketId: 'KXTEST-26-A' as never,
        side: 'yes',
        action: 'buy',
        amount: '20.00' as never,
        idempotencyKey: previewResponse.previewId,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('accepts an amount echo that differs only in trailing zeros', async () => {
    const harness = buildPredictNextIntegrationHarness((url, init) =>
      String(url).endsWith('/orders/preview') && init?.method === 'POST'
        ? { body: previewResponse }
        : { status: 404 },
    );

    const result = await buildService(harness).requestQuote(KALSHI_VENUE_ID, {
      marketId: 'KXTEST-26-A' as never,
      side: 'yes',
      action: 'buy',
      amount: '20' as never,
      idempotencyKey: previewResponse.previewId,
    });

    expect(result.previewId).toBe(previewResponse.previewId);
  });

  it('passes a sell quote through the shared workflow unchanged', async () => {
    const harness = buildPredictNextIntegrationHarness((url, init) =>
      String(url).endsWith('/v1/venues/kalshi/orders/preview') &&
      init?.method === 'POST'
        ? { body: sellPreviewResponse }
        : { status: 404 },
    );

    const result = await buildService(harness).requestQuote(KALSHI_VENUE_ID, {
      marketId: 'KXTEST-26-A' as never,
      side: 'yes',
      action: 'sell',
      contracts: '70' as never,
      idempotencyKey: sellPreviewResponse.previewId,
    });

    expect(result.previewId).toBe(sellPreviewResponse.previewId);
    expect(result).toMatchObject({
      requestedContracts: 70,
      estimatedNetProceeds: '30.89',
    });
    expect(harness.fetchMock).toHaveBeenCalledWith(
      'https://predict.example/v1/venues/kalshi/orders/preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          marketId: 'KXTEST-26-A',
          side: 'yes',
          action: 'sell',
          contracts: '70',
          idempotencyKey: sellPreviewResponse.previewId,
        }),
      }),
    );
  });
  it('keeps positions independently readable when the summary is rate limited without fabricating a balance', async () => {
    const harness = buildPredictNextIntegrationHarness((url) => {
      if (String(url).includes('/portfolio/summary')) {
        return { status: 429, body: { code: 'rate_limited' } };
      }
      if (String(url).includes('/positions')) {
        return { body: { venueId: 'kalshi', positions: [] } };
      }
      return { status: 404 };
    });

    const positions = harness.portfolioService.getPositions(
      KALSHI_VENUE_ID,
      {},
    );
    await expect(
      harness.portfolioService.getPortfolioSummary(KALSHI_VENUE_ID),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await expect(positions).resolves.toMatchObject({
      venueId: 'kalshi',
      positions: [],
    });
  });

  it('commits a sell Preview to its receipt, and a terminal receipt invalidates the portfolio reads', async () => {
    // The venue reports the pre-trade Position first, the reduced Position
    // after the Cash Out fills.
    let positionsBody: unknown = { venueId: 'kalshi', positions: [] };
    const harness = buildPredictNextIntegrationHarness((url, init) => {
      if (String(url).endsWith('/orders/preview') && init?.method === 'POST') {
        return { body: sellPreviewResponse };
      }
      if (isCommitUrl(url) && init?.method === 'POST') {
        return { body: sellReceiptResponse };
      }
      if (String(url).endsWith('/positions')) {
        return { body: positionsBody };
      }
      return { status: 404 };
    });
    // Wire the Order workflow to the harness root so a terminal receipt's
    // invalidation reaches the real portfolio service cache.
    const orderService = new PredictOrderService({
      messenger: getPredictOrderServiceMessenger(
        harness.messenger as unknown as Parameters<
          typeof getPredictOrderServiceMessenger
        >[0],
      ),
      trading: harness.adapter.trading,
      venueId: harness.adapter.venueId,
    });

    // Cache listeners see the pre-trade snapshot from the populate read.
    const updates = collectCacheUpdates(
      harness,
      hashKey(['PredictPortfolioService:getPositions', KALSHI_VENUE_ID, {}]),
    );

    const dateNow = jest.spyOn(Date, 'now');
    dateNow.mockReturnValue(1_000);

    // Populate the positions cache; the second read below must refetch
    // only because the terminal receipt invalidated its family.
    await harness.portfolioService.getPositions(KALSHI_VENUE_ID, {});
    const positionsCalls = () =>
      harness.fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/positions'),
      ).length;
    expect(positionsCalls()).toBe(1);
    expect(updates.length).toBeGreaterThan(0);
    const preTradeDataUpdatedAt =
      updates[updates.length - 1].state?.queries[0]?.state.dataUpdatedAt;

    // The venue now reports the reduced Position the Cash Out left behind.
    positionsBody = {
      venueId: 'kalshi',
      positions: [
        {
          ...position,
          shares: '37.50',
          costBasis: '20.63',
          currentValue: '22.50',
          unrealizedPnl: '1.87',
          unrealizedPnlPercent: '9.06',
        },
      ],
    };
    // A later wall clock stamps the refresh's dataUpdatedAt: the UI cache
    // hydrates a service snapshot only when it is strictly newer.
    dateNow.mockReturnValue(61_000);

    await quoteSell(orderService);
    const receipt = await orderService.commitPreview(
      KALSHI_VENUE_ID,
      sellReceiptResponse.previewId,
      { kind: 'user-approved' } as const,
    );

    expect(receipt).toMatchObject({
      action: 'sell',
      status: 'filled',
      netProceeds: '30.89',
    });
    // The device signs the venue create_order payload; those exact bytes are
    // the whole body. The Preview reference rides in the path.
    expect(commitBodies(harness)).toEqual([
      {
        ticker: 'KXTEST-26-A',
        client_order_id: expect.any(String),
        side: 'ask',
        count: '70.00',
        price: '0.4000',
        time_in_force: 'immediate_or_cancel',
        self_trade_prevention_type: 'taker_at_cross',
        reduce_only: true,
      },
    ]);

    // The terminal receipt's invalidation must reach cache listeners with
    // the SECOND read's body — the UI-visible contract: a mounted query
    // client hydrating this snapshot updates its Position row.
    await untilCacheCarries(updates, '37.50');
    const latest = updates[updates.length - 1];
    expect(latest.type).toBe('updated');
    expect(latest.state?.queries[0]?.state.data).toMatchObject({
      pages: [{ positions: [{ shares: '37.50' }] }],
    });
    expect(latest.state?.queries[0]?.state.dataUpdatedAt).toBeGreaterThan(
      preTradeDataUpdatedAt ?? 0,
    );

    // Let the fire-and-forget invalidation settle before re-reading.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await harness.portfolioService.getPositions(KALSHI_VENUE_ID, {});
    expect(positionsCalls()).toBe(2);
  });

  it('commits a buy Preview to its receipt, and a terminal receipt invalidates the portfolio reads', async () => {
    // The venue reports the pre-trade Balance first, the debited Balance
    // after the buy fills.
    let balanceBody: unknown = {
      venueId: 'kalshi',
      currency: 'USD',
      available: '79.14',
    };
    const harness = buildPredictNextIntegrationHarness((url, init) => {
      if (String(url).endsWith('/orders/preview') && init?.method === 'POST') {
        return { body: previewResponse };
      }
      if (isCommitUrl(url) && init?.method === 'POST') {
        return { body: buyReceiptResponse };
      }
      if (String(url).endsWith('/balance')) {
        return { body: balanceBody };
      }
      return { status: 404 };
    });
    // Wire the Order workflow to the harness root so a terminal receipt's
    // invalidation reaches the real portfolio service cache.
    const orderService = new PredictOrderService({
      messenger: getPredictOrderServiceMessenger(
        harness.messenger as unknown as Parameters<
          typeof getPredictOrderServiceMessenger
        >[0],
      ),
      trading: harness.adapter.trading,
      venueId: harness.adapter.venueId,
    });

    // Cache listeners see the pre-trade snapshot from the populate read.
    const updates = collectCacheUpdates(
      harness,
      hashKey(['PredictPortfolioService:getBalance', KALSHI_VENUE_ID]),
    );

    const dateNow = jest.spyOn(Date, 'now');
    dateNow.mockReturnValue(1_000);

    // Populate the Balance cache; the second read below must refetch
    // only because the terminal receipt invalidated its family.
    await harness.portfolioService.getBalance(KALSHI_VENUE_ID);
    const balanceCalls = () =>
      harness.fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/balance'),
      ).length;
    expect(balanceCalls()).toBe(1);
    expect(updates.length).toBeGreaterThan(0);
    const preTradeDataUpdatedAt =
      updates[updates.length - 1].state?.queries[0]?.state.dataUpdatedAt;

    // The venue now reports the debited Balance the buy left behind.
    balanceBody = {
      venueId: 'kalshi',
      currency: 'USD',
      available: '58.28',
    };
    // A later wall clock stamps the refresh's dataUpdatedAt: the UI cache
    // hydrates a service snapshot only when it is strictly newer.
    dateNow.mockReturnValue(61_000);

    await quoteBuy(orderService);
    const receipt = await orderService.commitPreview(
      KALSHI_VENUE_ID,
      buyReceiptResponse.previewId,
      { kind: 'user-approved' } as const,
    );

    expect(receipt).toMatchObject({
      action: 'buy',
      status: 'filled',
      actualSpend: '20.86',
      payoutExposure: '43.00',
    });
    expect(commitBodies(harness)).toEqual([
      {
        ticker: 'KXTEST-26-A',
        client_order_id: expect.any(String),
        side: 'bid',
        count: '41.00',
        price: '0.4651',
        time_in_force: 'immediate_or_cancel',
        self_trade_prevention_type: 'taker_at_cross',
        reduce_only: false,
      },
    ]);

    // Let the fire-and-forget invalidation settle before re-reading.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The terminal receipt's invalidation must reach cache listeners with
    // the SECOND read's body — the UI-visible contract: a mounted query
    // client hydrating this snapshot updates its Balance.
    await untilCacheCarries(updates, '58.28');
    const latest = updates[updates.length - 1];
    expect(latest.type).toBe('updated');
    expect(latest.state?.queries[0]?.state.data).toMatchObject({
      available: '58.28',
    });
    expect(latest.state?.queries[0]?.state.dataUpdatedAt).toBeGreaterThan(
      preTradeDataUpdatedAt ?? 0,
    );

    await harness.portfolioService.getBalance(KALSHI_VENUE_ID);
    expect(balanceCalls()).toBe(2);
  });

  describe('platform reset', () => {
    /** A pending receipt is observed through GET, never another POST. */
    const pendingReceipt = {
      ...buyReceiptResponse,
      status: 'pending',
      venueOrderId: null,
      filledContracts: null,
      averageFillPrice: null,
      fee: null,
      actualSpend: null,
      payoutExposure: null,
    };

    it('stops an observation loop without further commits or portfolio refreshes', async () => {
      let commitCalls = 0;
      let observeCalls = 0;
      let releaseObservation: (body: unknown) => void = () => undefined;
      const harness = buildPredictNextIntegrationHarness((url) => {
        if (String(url).includes('/balance')) {
          return {
            body: { venueId: 'kalshi', currency: 'USD', available: '100.00' },
          };
        }
        if (String(url).endsWith('/orders/preview')) {
          return { body: previewResponse };
        }
        if (isCommitUrl(url)) {
          commitCalls += 1;
          return { body: pendingReceipt };
        }
        if (isObserveUrl(url)) {
          observeCalls += 1;
          // The observation the test abandons: it stays open until released.
          return new Promise<{ body: unknown }>((resolve) => {
            releaseObservation = (body) => resolve({ body });
          });
        }
        return { status: 404 };
      });
      // Composed on the harness root, like the Engine does, so a terminal
      // receipt can invalidate the real portfolio cache.
      const orderService = new PredictOrderService({
        messenger: getPredictOrderServiceMessenger(
          harness.messenger as unknown as Parameters<
            typeof getPredictOrderServiceMessenger
          >[0],
        ),
        trading: harness.adapter.trading,
        venueId: harness.adapter.venueId,
        observationDelayMs: 0,
      });
      const balanceCalls = () =>
        harness.fetchMock.mock.calls.filter(([url]) =>
          String(url).includes('/balance'),
        ).length;

      // Prime the portfolio cache: a terminal receipt refreshes it.
      await harness.portfolioService.getBalance(KALSHI_VENUE_ID);
      expect(balanceCalls()).toBe(1);

      await quoteBuy(orderService);
      const commit = orderService.commitPreview(
        KALSHI_VENUE_ID,
        buyReceiptResponse.previewId,
        { kind: 'user-approved' } as const,
      );
      await until(() => observeCalls === 1);

      // The platform reset replaces the Predict User while the second
      // observation is in flight.
      orderService.abandonCommits();
      await expect(commit).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

      // The observation's terminal receipt arrives after the reset: the loop
      // sends no further request and refreshes no portfolio read.
      releaseObservation(buyReceiptResponse);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(commitCalls).toBe(1);
      expect(observeCalls).toBe(1);
      expect(balanceCalls()).toBe(1);
    });
  });
  describe('Active Venue change', () => {
    // REAL: selectActiveVenue, the Engine's Active Venue subscription, the
    // Order service, KalshiRemoteAdapter and PredictApiReadClient on the
    // Engine-root messenger. MOCKED: fetch, the bearer token, the Redux store.
    const BOTH_VENUES: PredictConfig = {
      enabled: true,
      venues: { polymarket: { enabled: true }, kalshi: { enabled: true } },
      venueSelection: { enabled: true },
    };

    /** A Redux store reduced to what `selectActiveVenue` reads. Selecting a
     * Venue writes the preference the way the picker does. */
    const buildVenueStore = () => {
      const listeners = new Set<() => void>();
      const stateFor = (venue: PredictConfiguredVenue) =>
        ({
          settings: { basicFunctionalityEnabled: true },
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: { predictConfig: BOTH_VENUES },
              },
              PredictVenueController: {
                venueSelectionPreference: venue,
                lastActiveVenue: null,
                sessionDefault: null,
              },
            },
          },
        }) as unknown as RootState;
      let state = stateFor('kalshi');
      return {
        source: {
          getState: () => state,
          subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
        },
        selectVenue: (venue: PredictConfiguredVenue) => {
          state = stateFor(venue);
          listeners.forEach((listener) => listener());
        },
      };
    };

    type Resolution = PredictOrderServiceOrderResolvedEvent['payload'][0];

    const cleanups: (() => void)[] = [];

    /** Composes the Order service the way `predictOrderServiceInit` does:
     * on the Engine root, cancelled by the Active Venue subscription. */
    const composeOrderFlow = (
      harness: ReturnType<typeof createPredictNextIntegrationHarness>,
    ) => {
      const store = buildVenueStore();
      const orderService = new PredictOrderService({
        messenger: getPredictOrderServiceMessenger(
          harness.messenger as unknown as Parameters<
            typeof getPredictOrderServiceMessenger
          >[0],
        ),
        trading: harness.adapter.trading,
        venueId: harness.adapter.venueId,
        observationDelayMs: 0,
        backgroundObservationDelaysMs: [10],
      });
      const unsubscribe = subscribeToActiveVenueChanges(store.source, () =>
        orderService.cancelUncommittedPreviews(),
      );
      const resolutions: Resolution[] = [];
      (
        harness.messenger as unknown as {
          subscribe: (event: string, handler: (r: Resolution) => void) => void;
        }
      ).subscribe('PredictOrderService:orderResolved', (resolution) =>
        resolutions.push(resolution),
      );
      cleanups.push(() => {
        unsubscribe();
        orderService.destroy();
      });
      return { orderService, store, resolutions };
    };

    beforeEach(() => {
      // The shared test setup freezes Date.now; Preview expiry and the
      // observation schedule need a clock that moves with the timers.
      // `new Date()` reads the system clock, not Date.now.
      jest.spyOn(Date, 'now').mockImplementation(() => new Date().getTime());
    });
    afterEach(() => {
      cleanups.splice(0).forEach((cleanup) => cleanup());
    });

    /** A Preview the backend says is valid for `validForMs` from now. */
    const freshPreview = (validForMs = 30_000) => ({
      ...previewResponse,
      expiresAt: new Date(Date.now() + validForMs).toISOString(),
    });

    const pendingReceipt = {
      ...buyReceiptResponse,
      status: 'pending',
      venueOrderId: null,
      filledContracts: null,
      averageFillPrice: null,
      fee: null,
      actualSpend: null,
      payoutExposure: null,
    };

    const callsTo = (
      harness: ReturnType<typeof createPredictNextIntegrationHarness>,
      route: string,
    ) =>
      harness.fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith(route),
      );
    const commitsTo = (
      harness: ReturnType<typeof createPredictNextIntegrationHarness>,
    ) => harness.fetchMock.mock.calls.filter(([url]) => isCommitUrl(url));
    const observationsOf = (
      harness: ReturnType<typeof createPredictNextIntegrationHarness>,
    ) => harness.fetchMock.mock.calls.filter(([url]) => isObserveUrl(url));

    it('before the quote returns: aborts the quote and never makes its Preview approvable', async () => {
      let answerQuote: () => void = () => undefined;
      const harness = buildPredictNextIntegrationHarness((url) => {
        if (String(url).endsWith('/orders/preview')) {
          return new Promise((resolve) => {
            answerQuote = () => resolve({ body: freshPreview() });
          });
        }
        return { status: 404 };
      });
      const { orderService, store, resolutions } = composeOrderFlow(harness);

      const quoting = quoteBuy(orderService);
      await until(() => callsTo(harness, '/orders/preview').length === 1);
      store.selectVenue('polymarket');

      const [, quoteInit] = callsTo(harness, '/orders/preview')[0];
      expect(quoteInit?.signal?.aborted).toBe(true);
      // The backend answers anyway: the answer is refused.
      answerQuote();
      await expect(quoting).rejects.toMatchObject({ code: 'PREVIEW_EXPIRED' });

      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, previewResponse.previewId),
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
      expect(commitsTo(harness)).toHaveLength(0);
      expect(resolutions).toHaveLength(0);
    });

    it('after the Preview: cancels it, refuses its Commit locally, and a switch back does not revive it', async () => {
      const harness = buildPredictNextIntegrationHarness((url) =>
        String(url).endsWith('/orders/preview')
          ? { body: freshPreview() }
          : { body: buyReceiptResponse },
      );
      const { orderService, store, resolutions } = composeOrderFlow(harness);

      await quoteBuy(orderService);
      store.selectVenue('polymarket');
      store.selectVenue('kalshi');

      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, previewResponse.previewId),
      ).rejects.toMatchObject({ code: 'PREVIEW_EXPIRED' });
      expect(commitsTo(harness)).toHaveLength(0);
      expect(resolutions).toHaveLength(0);
    });

    it('during the Commit: keeps the original Venue and Preview, keeps observing, and notifies once', async () => {
      let commits = 0;
      let observations = 0;
      let answerFirstCommit: () => void = () => undefined;
      const harness = buildPredictNextIntegrationHarness((url) => {
        if (String(url).endsWith('/orders/preview')) {
          return { body: freshPreview() };
        }
        if (isCommitUrl(url)) {
          commits += 1;
          return new Promise((resolve) => {
            answerFirstCommit = () => resolve({ body: pendingReceipt });
          });
        }
        if (isObserveUrl(url)) {
          observations += 1;
          // Still working through the bounded loop, filled afterwards.
          return {
            body: observations < 5 ? pendingReceipt : buyReceiptResponse,
          };
        }
        if (String(url).includes('/balance')) {
          return {
            body: { venueId: 'kalshi', currency: 'USD', available: '79.14' },
          };
        }
        return { status: 404 };
      });
      const { orderService, store, resolutions } = composeOrderFlow(harness);
      await harness.portfolioService.getBalance(KALSHI_VENUE_ID);
      await quoteBuy(orderService);

      const commit = orderService.commitPreview(
        KALSHI_VENUE_ID,
        previewResponse.previewId,
        { kind: 'user-approved' } as const,
      );
      await until(() => commits === 1);
      // The Commit is on the wire when the Active Venue changes.
      store.selectVenue('polymarket');
      answerFirstCommit();

      await expect(commit).resolves.toMatchObject({ status: 'pending' });
      await until(() => resolutions.length === 1, 5_000);

      // One signed Commit; every request after it reads the same
      // operation at the original Venue, with the original Preview and the
      // same person, and signs nothing.
      const commitCalls = commitsTo(harness);
      expect(commitCalls).toHaveLength(1);
      expect(commitCalls[0]?.[0]).toBe(
        `https://predict.example/v1/venues/kalshi/orders/${previewResponse.previewId}/commit`,
      );
      expect(JSON.parse(String(commitCalls[0]?.[1]?.body))).toMatchObject({
        ticker: 'KXTEST-26-A',
        side: 'bid',
        count: '41.00',
        price: '0.4651',
      });
      const observeCalls = observationsOf(harness);
      expect(observeCalls).toHaveLength(5);
      for (const [url, init] of observeCalls) {
        expect(url).toBe(
          `https://predict.example/v1/venues/kalshi/orders/${previewResponse.previewId}`,
        );
        expect(init?.method).toBe('GET');
        expect(init?.headers).toMatchObject({
          Authorization: 'Bearer test-bearer-token',
        });
      }
      expect(callsTo(harness, '/orders/preview')).toHaveLength(1);
      expect(resolutions).toEqual([
        {
          venueId: KALSHI_VENUE_ID,
          previewId: previewResponse.previewId,
          outcome: {
            status: 'settled',
            receipt: expect.objectContaining({ status: 'filled' }),
          },
          presented: false,
        },
      ]);
      // The terminal receipt refreshed the original Venue's reads.
      await until(
        () =>
          harness.fetchMock.mock.calls.filter(([url]) =>
            String(url).includes('/balance'),
          ).length === 2,
      );

      // Nothing more is observed or notified.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(commitsTo(harness)).toHaveLength(1);
      expect(observationsOf(harness)).toHaveLength(5);
      expect(resolutions).toHaveLength(1);
    });

    it('with a lost response the backend received: observes the same Preview and notifies once', async () => {
      const operations = new Set<string>();
      let commits = 0;
      let observations = 0;
      const preview = freshPreview(500);
      const harness = buildPredictNextIntegrationHarness((url, init) => {
        if (String(url).endsWith('/orders/preview')) {
          return { body: preview };
        }
        if (isCommitUrl(url) && init?.method === 'POST') {
          commits += 1;
          // The backend creates the operation; the response never arrives.
          operations.add(previewIdOf(url));
          throw new TypeError('Network request failed');
        }
        if (isObserveUrl(url)) {
          observations += 1;
          return operations.has(previewIdOf(url))
            ? { body: buyReceiptResponse }
            : { status: 404, body: { code: 'operation_not_found' } };
        }
        return { status: 404 };
      });
      const { orderService, store, resolutions } = composeOrderFlow(harness);
      await quoteBuy(orderService);

      const commit = orderService.commitPreview(
        KALSHI_VENUE_ID,
        previewResponse.previewId,
        { kind: 'user-approved' } as const,
      );
      store.selectVenue('polymarket');
      await expect(commit).rejects.toMatchObject({
        code: 'ORDER_OUTCOME_UNKNOWN',
      });

      await until(() => resolutions.length === 1, 5_000);
      // One signed Commit, then a read of the same Preview reference.
      expect(commits).toBe(1);
      expect(observations).toBe(1);
      expect(callsTo(harness, '/orders/preview')).toHaveLength(1);
      expect(resolutions[0]).toMatchObject({
        previewId: previewResponse.previewId,
        outcome: { status: 'settled' },
        presented: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(commits).toBe(1);
      expect(observations).toBe(1);
      expect(resolutions).toHaveLength(1);
    });

    it('keeps a lost POST unknown through observe404 beyond expiry, then accepts a late fill without another POST', async () => {
      let commits = 0;
      let observations = 0;
      let expired = false;
      const previewTtlMs = 30_000;
      // Past the Preview expiry, still inside the missing-operation grace.
      // A GET that starts after expiry plus that grace may resolve not-placed.
      const beyondExpiryMs =
        previewTtlMs + Math.floor(MISSING_OPERATION_EXPIRY_GRACE_MS / 2);
      jest
        .spyOn(Date, 'now')
        .mockImplementation(
          () => new Date().getTime() + (expired ? beyondExpiryMs : 0),
        );
      // This app targets ES2022, before Promise.withResolvers.
      let releaseObservation!: () => void;
      const observationGate = new Promise<void>((resolve) => {
        releaseObservation = resolve;
      });
      let reportObservation!: () => void;
      const observationStarted = new Promise<void>((resolve) => {
        reportObservation = resolve;
      });
      const harness = buildPredictNextIntegrationHarness(async (url) => {
        if (String(url).endsWith('/orders/preview')) {
          return { body: freshPreview(previewTtlMs) };
        }
        if (isCommitUrl(url)) {
          commits += 1;
          throw new TypeError('Network request failed');
        }
        if (isObserveUrl(url)) {
          observations += 1;
          if (observations === 1) {
            return { status: 404, body: { code: 'operation_not_found' } };
          }
          reportObservation();
          await observationGate;
          return { body: buyReceiptResponse };
        }
        return { status: 404 };
      });
      const { orderService, store, resolutions } = composeOrderFlow(harness);
      await quoteBuy(orderService);
      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, previewResponse.previewId, {
          kind: 'user-approved',
        } as const),
      ).rejects.toMatchObject({ code: 'ORDER_OUTCOME_UNKNOWN' });
      expired = true;
      store.selectVenue('polymarket');
      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, previewResponse.previewId),
      ).rejects.toMatchObject({ code: 'ORDER_OUTCOME_UNKNOWN' });
      expect(resolutions).toEqual([]);
      expect(commits).toBe(1);

      await observationStarted;
      const repeatedApproval = orderService.commitPreview(
        KALSHI_VENUE_ID,
        previewResponse.previewId,
      );
      releaseObservation();
      await expect(repeatedApproval).resolves.toMatchObject({
        status: 'filled',
      });
      expect(resolutions).toEqual([
        expect.objectContaining({
          outcome: expect.objectContaining({ status: 'settled' }),
          presented: false,
        }),
      ]);
      expect(commits).toBe(1);
      expect(observations).toBe(2);
    });
  });

  describe('identity replacement', () => {
    it("never sends the previous person's Preview with the next person's bearer token", async () => {
      const harness = buildPredictNextIntegrationHarness((url) =>
        String(url).endsWith('/orders/preview')
          ? {
              body: {
                ...previewResponse,
                expiresAt: new Date(Date.now() + 30_000).toISOString(),
              },
            }
          : { body: buyReceiptResponse },
      );
      const orderService = buildService(harness);
      await quoteBuy(orderService);

      // The Commit is waiting for its bearer token when the wallet resets.
      let issueToken: (token: string) => void = () => undefined;
      harness.getBearerTokenMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            issueToken = resolve;
          }),
      );
      const commit = orderService.commitPreview(
        KALSHI_VENUE_ID,
        previewResponse.previewId,
        { kind: 'user-approved' } as const,
      );
      orderService.abandonCommits();
      issueToken('next-person-token');
      await expect(commit).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

      // Nor can anything commit it afterwards.
      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, previewResponse.previewId),
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(
        harness.fetchMock.mock.calls.filter(
          ([url]) => isCommitUrl(url) || isObserveUrl(url),
        ),
      ).toHaveLength(0);
    });
  });
});
