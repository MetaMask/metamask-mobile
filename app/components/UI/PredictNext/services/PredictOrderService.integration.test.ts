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
  PREDICT_ORDER_SERVICE_NAME,
  PredictOrderService,
} from '../services/PredictOrderService';
import { KALSHI_VENUE_ID } from '../types';

const previewResponse = {
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  requestedAmount: '20.00',
  orderAmount: '20.00',
  estimatedContracts: 43,
  averagePrice: '0.4651',
  fee: '0.86',
  feeBreakdown: [
    { source: 'venue', amount: '0.43' },
    { source: 'metamask', amount: '0.43' },
  ],
  totalDebit: '20.86',
  potentialPayout: '43.00',
  potentialProfit: '22.14',
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
    });

    expect(result.previewId).toBe(previewResponse.previewId);
    expect(result).toMatchObject({ totalDebit: '20.86' });
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
        body: JSON.stringify({
          marketId: 'KXTEST-26-A',
          side: 'yes',
          amount: '20.00',
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
        }),
      }),
    );
  });

  it('commits a sell Preview to its receipt, and a terminal receipt invalidates the portfolio reads', async () => {
    // The venue reports the pre-trade Position first, the reduced Position
    // after the Cash Out fills.
    let positionsBody: unknown = { venueId: 'kalshi', positions: [] };
    const harness = buildPredictNextIntegrationHarness((url, init) => {
      if (String(url).endsWith('/orders/commit') && init?.method === 'POST') {
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
      positions: [{ ...position, shares: '37.50', marketExposure: '20.63' }],
    };
    // A later wall clock stamps the refresh's dataUpdatedAt: the UI cache
    // hydrates a service snapshot only when it is strictly newer.
    dateNow.mockReturnValue(61_000);

    const receipt = await orderService.commitPreview(
      KALSHI_VENUE_ID,
      sellReceiptResponse.previewId,
    );

    expect(receipt).toMatchObject({
      action: 'sell',
      status: 'filled',
      netProceeds: '30.89',
    });
    expect(harness.fetchMock).toHaveBeenCalledWith(
      'https://predict.example/v1/venues/kalshi/orders/commit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ previewId: sellReceiptResponse.previewId }),
      }),
    );

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
      if (String(url).endsWith('/orders/commit') && init?.method === 'POST') {
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

    const receipt = await orderService.commitPreview(
      KALSHI_VENUE_ID,
      buyReceiptResponse.previewId,
    );

    expect(receipt).toMatchObject({
      action: 'buy',
      status: 'filled',
      actualSpend: '20.86',
      payoutExposure: '43.00',
    });
    expect(harness.fetchMock).toHaveBeenCalledWith(
      'https://predict.example/v1/venues/kalshi/orders/commit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ previewId: buyReceiptResponse.previewId }),
      }),
    );

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
});
