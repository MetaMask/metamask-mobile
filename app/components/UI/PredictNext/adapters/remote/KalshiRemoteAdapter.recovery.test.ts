import { KalshiRemoteAdapter } from './KalshiRemoteAdapter';
import {
  PredictHttpError,
  type PredictApiReadTransport,
} from './PredictApiReadClient';

const unresolved = {
  previewId: 'preview-one',
  createdAt: '2026-03-01T12:00:00.000Z',
  submittedAt: null,
  receipt: {
    operationId: 'operation-one',
    previewId: 'preview-one',
    venueId: 'kalshi',
    marketId: 'market-one',
    side: 'yes',
    action: 'buy',
    status: 'needs_manual_review',
    requestedMaxSpend: '4.00',
    quotedContracts: 10,
    venueOrderId: null,
    filledContracts: null,
    actualSpend: null,
    averageFillPrice: null,
    fee: null,
    payoutExposure: null,
  },
};

describe('Kalshi unresolved discovery', () => {
  it('parses canonical unresolved receipts and forwards pagination/signal only', async () => {
    const listUnresolvedOrders = jest.fn().mockResolvedValue({
      operations: [unresolved],
      nextCursor: 'next',
    });
    const client = {
      listUnresolvedOrders,
    } as unknown as PredictApiReadTransport;
    const adapter = new KalshiRemoteAdapter(client);
    const signal = new AbortController().signal;
    await expect(
      adapter.trading.listUnresolvedOrders(
        { cursor: 'cursor', limit: 25 },
        { signal },
      ),
    ).resolves.toEqual({ operations: [unresolved], nextCursor: 'next' });
    expect(listUnresolvedOrders).toHaveBeenCalledWith(
      'kalshi',
      { cursor: 'cursor', limit: 25 },
      { signal },
    );
  });

  it('rejects a cross-venue receipt before exposing another account model', async () => {
    const client = {
      listUnresolvedOrders: jest.fn().mockResolvedValue({
        operations: [
          {
            ...unresolved,
            receipt: { ...unresolved.receipt, venueId: 'other' },
          },
        ],
      }),
    } as unknown as PredictApiReadTransport;
    await expect(
      new KalshiRemoteAdapter(client).trading.listUnresolvedOrders({}),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('keeps discovery error evidence in the observation phase, never commit', async () => {
    const client = {
      listUnresolvedOrders: jest
        .fn()
        .mockRejectedValue(new PredictHttpError(404, 'operation_not_found')),
    } as unknown as PredictApiReadTransport;
    await expect(
      new KalshiRemoteAdapter(client).trading.listUnresolvedOrders({}),
    ).rejects.toMatchObject({
      code: 'ORDER_OUTCOME_UNKNOWN',
      metadata: { phase: 'observe' },
    });
  });
});
