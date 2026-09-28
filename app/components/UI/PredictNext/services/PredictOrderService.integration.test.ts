import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
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
  filledContracts: 65,
  averageFillPrice: '0.4800',
  fee: '0.31',
  actualProceeds: '31.20',
  netProceeds: '30.89',
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

  afterEach(() => {
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
    const harness = buildPredictNextIntegrationHarness((url, init) => {
      if (String(url).endsWith('/orders/commit') && init?.method === 'POST') {
        return { body: sellReceiptResponse };
      }
      if (String(url).endsWith('/positions')) {
        return { body: { venueId: 'kalshi', positions: [] } };
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

    // Populate the positions cache; the second read below must refetch
    // only because the terminal receipt invalidated its family.
    await harness.portfolioService.getPositions(KALSHI_VENUE_ID, {});
    const positionsCalls = () =>
      harness.fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/positions'),
      ).length;
    expect(positionsCalls()).toBe(1);

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

    // Let the fire-and-forget invalidation settle before re-reading.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await harness.portfolioService.getPositions(KALSHI_VENUE_ID, {});
    expect(positionsCalls()).toBe(2);
  });
});
