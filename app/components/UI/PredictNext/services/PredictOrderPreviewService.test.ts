import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';

import { PredictError, PredictErrorCode } from '../errors';
import {
  isPreviewExpired,
  PREDICT_ORDER_PREVIEW_SERVICE_NAME,
  PredictOrderPreviewService,
} from './PredictOrderPreviewService';
import {
  KALSHI_VENUE_ID,
  type PredictDecimal,
  type PredictEntityId,
  type PredictOrderPreview,
  type PredictVenueId,
  type PredictAmount,
  type PredictSignedAmount,
  type PredictTimestamp,
} from '../types';

const preview: PredictOrderPreview = {
  previewId: 'preview-1',
  venueId: KALSHI_VENUE_ID,
  marketId: 'KXTEST-26-A' as PredictEntityId,
  side: 'yes',
  requestedAmount: '4.00' as PredictAmount,
  orderAmount: '4.00' as PredictAmount,
  estimatedContracts: 10,
  averagePrice: '0.4000' as PredictDecimal,
  fee: '0.20' as PredictAmount,
  feeBreakdown: [
    { source: 'venue', amount: '0.10' as PredictAmount },
    { source: 'metamask', amount: '0.10' as PredictAmount },
  ],
  totalDebit: '4.20' as PredictAmount,
  potentialPayout: '10.00' as PredictAmount,
  potentialProfit: '5.80' as PredictSignedAmount,
  expiresAt: '2026-03-01T12:00:30.000Z' as PredictTimestamp,
};

const previewOrder = jest.fn<Promise<PredictOrderPreview>, []>();
const trading = { previewOrder };

const serviceWith = (submitDelayMs?: number) => {
  const rootMessenger = new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const messenger = new Messenger({
    namespace: PREDICT_ORDER_PREVIEW_SERVICE_NAME,
    parent: rootMessenger,
  });
  return new PredictOrderPreviewService({
    messenger,
    trading,
    venueId: KALSHI_VENUE_ID,
    ...(submitDelayMs === undefined ? {} : { submitDelayMs }),
  });
};

beforeEach(() => {
  trading.previewOrder.mockReset();
  trading.previewOrder.mockResolvedValue(preview);
});

const service = () => serviceWith(0);

describe('PredictOrderPreviewService', () => {
  it('requests a quote through the trading capability', async () => {
    const result = await service().requestQuote(KALSHI_VENUE_ID, {
      marketId: 'KXTEST-26-A' as PredictEntityId,
      side: 'yes',
      amount: '4.00' as PredictAmount,
    });

    expect(result).toBe(preview);
    expect(trading.previewOrder).toHaveBeenCalledWith(
      { marketId: 'KXTEST-26-A', side: 'yes', amount: '4.00' },
      { signal: undefined },
    );
  });

  it('treats a preview at its expiry instant as expired', () => {
    const at = Date.parse(preview.expiresAt);

    expect(isPreviewExpired(preview, at)).toBe(true);
    expect(isPreviewExpired(preview, at - 1)).toBe(false);
  });

  it('submits through the stub without placing a real order', async () => {
    const result = await service().submitOrder(KALSHI_VENUE_ID, 'preview-1');

    expect(result).toEqual({ previewId: 'preview-1' });
    expect(trading.previewOrder).toHaveBeenCalledTimes(0);
  });

  it('rejects submissions for another venue', async () => {
    await expect(
      service().submitOrder('polymarket' as PredictVenueId, 'preview-1'),
    ).rejects.toMatchObject({ code: PredictErrorCode.UNSUPPORTED_VENUE });
  });

  it('rejects quotes for another venue', async () => {
    await expect(
      service().requestQuote('polymarket' as PredictVenueId, {
        marketId: 'KXTEST-26-A' as PredictEntityId,
        side: 'yes',
        amount: '4.00' as PredictAmount,
      }),
    ).rejects.toMatchObject({ code: PredictErrorCode.UNSUPPORTED_VENUE });
  });

  it('propagates PredictError from the trading capability untouched', async () => {
    trading.previewOrder.mockRejectedValueOnce(
      PredictError.from(PredictErrorCode.INSUFFICIENT_BALANCE),
    );

    await expect(
      service().requestQuote(KALSHI_VENUE_ID, {
        marketId: 'KXTEST-26-A' as PredictEntityId,
        side: 'yes',
        amount: '4.00' as PredictAmount,
      }),
    ).rejects.toMatchObject({ code: PredictErrorCode.INSUFFICIENT_BALANCE });
  });
});
