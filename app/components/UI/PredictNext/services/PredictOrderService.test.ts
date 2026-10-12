import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';

import { PredictError, PredictErrorCode } from '../errors';
import {
  isPreviewExpired,
  PREDICT_ORDER_SERVICE_NAME,
  type PredictOrderServiceActions,
  type PredictOrderServiceMessenger,
  PredictOrderService,
} from './PredictOrderService';
import {
  KALSHI_VENUE_ID,
  type PredictBuyOrderReceipt,
  type PredictDecimal,
  type PredictEntityId,
  type PredictOrderPreview,
  type PredictOrderReceipt,
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
  action: 'buy',
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

const sellPreview: PredictOrderPreview = {
  previewId: 'preview-sell-1',
  venueId: KALSHI_VENUE_ID,
  marketId: 'KXTEST-26-A' as PredictEntityId,
  side: 'yes',
  action: 'sell',
  requestedContracts: 70,
  estimatedContracts: 65,
  averagePrice: '0.4800' as PredictDecimal,
  limitPrice: '0.4000' as PredictDecimal,
  fee: '0.31' as PredictAmount,
  feeBreakdown: [
    { source: 'venue', amount: '0.16' as PredictAmount },
    { source: 'metamask', amount: '0.15' as PredictAmount },
  ],
  estimatedProceeds: '31.20' as PredictAmount,
  estimatedNetProceeds: '30.89' as PredictAmount,
  expiresAt: '2026-03-01T12:00:30.000Z' as PredictTimestamp,
};

const receipt: PredictOrderReceipt = {
  operationId: 'operation-1',
  previewId: 'preview-1',
  venueId: KALSHI_VENUE_ID,
  marketId: 'KXTEST-26-A' as PredictEntityId,
  side: 'yes',
  action: 'buy',
  status: 'filled',
  requestedMaxSpend: '4.00' as PredictAmount,
  quotedContracts: 10,
  venueOrderId: 'venue-order-1',
  filledContracts: '10' as PredictAmount,
  actualSpend: '4.18' as PredictAmount,
  averageFillPrice: '0.4000' as PredictDecimal,
  fee: '0.18' as PredictAmount,
  payoutExposure: '10.00' as PredictAmount,
};

const sellReceipt: PredictOrderReceipt = {
  operationId: 'operation-sell-1',
  previewId: 'preview-sell-1',
  venueId: KALSHI_VENUE_ID,
  marketId: 'KXTEST-26-A' as PredictEntityId,
  side: 'yes',
  action: 'sell',
  status: 'filled',
  quotedContracts: 70,
  venueOrderId: 'venue-order-1',
  filledContracts: '70.00' as PredictAmount,
  averageFillPrice: '0.4800' as PredictDecimal,
  fee: '0.31' as PredictAmount,
  actualProceeds: '31.20' as PredictAmount,
  netProceeds: '30.89' as PredictAmount,
};

const receiptWith = (
  overrides: Partial<PredictBuyOrderReceipt>,
): PredictOrderReceipt => ({ ...receipt, ...overrides }) as PredictOrderReceipt;

const previewOrder = jest.fn<Promise<PredictOrderPreview>, []>();
const commitOrder = jest.fn<Promise<PredictOrderReceipt>, []>();
const invalidateQueries = jest.fn<Promise<void>, []>();
const trading = { previewOrder, commitOrder };

const serviceWith = (observationDelayMs?: number) => {
  const rootMessenger = new Messenger<
    MockAnyNamespace,
    PredictOrderServiceActions,
    never
  >({ namespace: MOCK_ANY_NAMESPACE });
  const messenger: PredictOrderServiceMessenger = new Messenger({
    namespace: PREDICT_ORDER_SERVICE_NAME,
    parent: rootMessenger,
  });
  // Mirror the Engine messenger wiring: the service consumes the portfolio
  // invalidation action after a terminal receipt.
  invalidateQueries.mockReset();
  invalidateQueries.mockResolvedValue(undefined);
  rootMessenger.registerActionHandler(
    'PredictPortfolioService:invalidateQueries',
    invalidateQueries,
  );
  rootMessenger.delegate({
    actions: ['PredictPortfolioService:invalidateQueries'],
    events: [],
    messenger,
  });
  return new PredictOrderService({
    messenger,
    trading,
    venueId: KALSHI_VENUE_ID,
    ...(observationDelayMs === undefined ? {} : { observationDelayMs }),
  });
};

beforeEach(() => {
  trading.previewOrder.mockReset();
  trading.previewOrder.mockResolvedValue(preview);
  trading.commitOrder.mockReset();
});

const service = () => serviceWith(0);

const buyQuoteParams = {
  marketId: 'KXTEST-26-A' as PredictEntityId,
  side: 'yes' as const,
  action: 'buy' as const,
  amount: '4.00' as PredictAmount,
};
const sellQuoteParams = {
  marketId: 'KXTEST-26-A' as PredictEntityId,
  side: 'yes' as const,
  action: 'sell' as const,
  contracts: '70' as PredictAmount,
};

const balanceFilter = {
  queryKey: ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
};
const positionsFilter = {
  queryKey: ['PredictPortfolioService:getPositions', KALSHI_VENUE_ID],
};
const activityFilter = {
  queryKey: ['PredictPortfolioService:getActivity', KALSHI_VENUE_ID],
};

describe('PredictOrderService', () => {
  it('requests a quote through the trading capability', async () => {
    const result = await service().requestQuote(
      KALSHI_VENUE_ID,
      buyQuoteParams,
    );

    expect(result).toBe(preview);
    expect(trading.previewOrder).toHaveBeenCalledWith(
      { marketId: 'KXTEST-26-A', side: 'yes', action: 'buy', amount: '4.00' },
      { signal: undefined },
    );
  });

  it('passes a sell quote through the shared workflow unchanged', async () => {
    trading.previewOrder.mockResolvedValue(sellPreview);

    const result = await service().requestQuote(
      KALSHI_VENUE_ID,
      sellQuoteParams,
    );

    expect(result).toBe(sellPreview);
    expect(trading.previewOrder).toHaveBeenCalledWith(
      { marketId: 'KXTEST-26-A', side: 'yes', action: 'sell', contracts: '70' },
      { signal: undefined },
    );
  });

  it('treats a preview at its expiry instant as expired', () => {
    const at = Date.parse(preview.expiresAt);

    expect(isPreviewExpired(preview, at)).toBe(true);
    expect(isPreviewExpired(preview, at - 1)).toBe(false);
  });

  it('rejects commits for another venue', async () => {
    await expect(
      service().commitPreview('polymarket' as PredictVenueId, 'preview-1'),
    ).rejects.toMatchObject({ code: PredictErrorCode.UNSUPPORTED_VENUE });
    expect(trading.commitOrder).toHaveBeenCalledTimes(0);
  });

  it('rejects quotes for another venue', async () => {
    await expect(
      service().requestQuote('polymarket' as PredictVenueId, buyQuoteParams),
    ).rejects.toMatchObject({ code: PredictErrorCode.UNSUPPORTED_VENUE });
  });

  it('propagates PredictError from the trading capability untouched', async () => {
    trading.previewOrder.mockRejectedValueOnce(
      PredictError.from(PredictErrorCode.INSUFFICIENT_BALANCE),
    );

    await expect(
      service().requestQuote(KALSHI_VENUE_ID, buyQuoteParams),
    ).rejects.toMatchObject({ code: PredictErrorCode.INSUFFICIENT_BALANCE });
  });

  describe('commitPreview', () => {
    it.each(['filled', 'partially_filled', 'not_filled', 'rejected'] as const)(
      'resolves with a %s buy receipt and invalidates the portfolio reads',
      async (status) => {
        trading.commitOrder.mockResolvedValue(receiptWith({ status }));

        const result = await service().commitPreview(
          KALSHI_VENUE_ID,
          'preview-1',
        );

        expect(result).toEqual(receiptWith({ status }));
        expect(trading.commitOrder).toHaveBeenCalledTimes(1);
        expect(invalidateQueries).toHaveBeenCalledTimes(3);
        expect(invalidateQueries).toHaveBeenNthCalledWith(1, balanceFilter);
        expect(invalidateQueries).toHaveBeenNthCalledWith(2, positionsFilter);
        expect(invalidateQueries).toHaveBeenNthCalledWith(3, activityFilter);
      },
    );

    it.each(['filled', 'partially_filled', 'not_filled', 'rejected'] as const)(
      'resolves with a %s sell receipt and invalidates the portfolio reads',
      async (status) => {
        trading.commitOrder.mockResolvedValue({
          ...sellReceipt,
          status,
          venueOrderId: null,
          filledContracts: null,
          averageFillPrice: null,
          fee: null,
          actualProceeds: null,
          netProceeds: null,
        });

        const result = await service().commitPreview(
          KALSHI_VENUE_ID,
          'preview-sell-1',
        );

        expect(result.status).toBe(status);
        expect(trading.commitOrder).toHaveBeenCalledTimes(1);
        expect(invalidateQueries).toHaveBeenCalledTimes(3);
      },
    );

    it('observes an in-progress operation by re-POSTing the same commit', async () => {
      trading.commitOrder
        .mockResolvedValueOnce(receiptWith({ status: 'pending' }))
        .mockResolvedValueOnce(receiptWith({ status: 'submitted' }))
        .mockResolvedValueOnce(receiptWith({ status: 'filled' }));

      const result = await service().commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(result).toEqual(receiptWith({ status: 'filled' }));
      expect(trading.commitOrder).toHaveBeenCalledTimes(3);
      // Every observation re-POSTs the same Preview reference: one operation.
      expect(trading.commitOrder).toHaveBeenCalledWith('preview-1');
    });

    it('stops observing after a small bounded number of re-POSTs', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'pending' }));

      const result = await service().commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      // Initial commit plus the bounded observations, never unbounded.
      expect(trading.commitOrder).toHaveBeenCalledTimes(4);
      expect(result).toEqual(receiptWith({ status: 'pending' }));
      expect(invalidateQueries).toHaveBeenCalledTimes(0);
    });

    it('resolves a reconciliation_required receipt without refreshing and re-POSTs on the next explicit call', async () => {
      trading.commitOrder
        .mockResolvedValueOnce(
          receiptWith({ status: 'reconciliation_required' }),
        )
        .mockResolvedValueOnce(receiptWith({ status: 'filled' }));

      const orderService = service();
      const first = await orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(first).toEqual(receiptWith({ status: 'reconciliation_required' }));
      expect(trading.commitOrder).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledTimes(0);

      const second = await orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(second).toEqual(receiptWith({ status: 'filled' }));
      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
      expect(invalidateQueries).toHaveBeenCalledTimes(3);
    });

    it('coalesces repeated commits of one operation into the in-flight commit', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'filled' }));

      const orderService = service();
      const [first, second] = await Promise.all([
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1'),
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1'),
      ]);

      expect(first).toBe(second);
      expect(trading.commitOrder).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledTimes(3);
    });

    it('shares rejections across coalesced calls and allows a fresh commit afterwards', async () => {
      trading.commitOrder.mockRejectedValueOnce(
        PredictError.from(PredictErrorCode.INVALID_RESPONSE),
      );
      trading.commitOrder.mockResolvedValueOnce(
        receiptWith({ status: 'filled' }),
      );

      const orderService = service();
      const settled = await Promise.allSettled([
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1'),
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1'),
      ]);
      const failures = settled.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );

      expect(failures).toHaveLength(2);
      expect(failures[0].reason).toBe(failures[1].reason);
      expect(trading.commitOrder).toHaveBeenCalledTimes(1);

      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toEqual(receiptWith({ status: 'filled' }));
      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
    });

    it('propagates commit failures untouched', async () => {
      trading.commitOrder.mockRejectedValue(
        PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE),
      );

      await expect(
        service().commitPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).rejects.toMatchObject({ code: PredictErrorCode.VENUE_UNAVAILABLE });
      expect(invalidateQueries).toHaveBeenCalledTimes(0);
    });
  });
});
