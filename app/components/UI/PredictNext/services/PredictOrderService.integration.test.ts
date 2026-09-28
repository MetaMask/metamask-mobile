import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { buildPredictNextIntegrationHarness as createPredictNextIntegrationHarness } from '../../../../../tests/integration/harnesses/predict-next';
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
      amount: '20.00' as never,
    });

    expect(result.previewId).toBe(previewResponse.previewId);
    expect(result.totalDebit).toBe('20.86');
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
      amount: '20' as never,
    });

    expect(result.previewId).toBe(previewResponse.previewId);
  });
});
