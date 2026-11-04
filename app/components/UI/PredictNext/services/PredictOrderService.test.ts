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
  type PredictOrderServiceEvents,
  type PredictOrderServiceMessenger,
  type PredictOrderServiceOptions,
  PredictOrderService,
  type PredictOrderCommitSigning,
} from './PredictOrderService';
import {
  type PredictDecimal,
  type PredictEntityId,
  type PredictOrderPreview,
  type PredictOrderReceipt,
  type PredictVenueId,
  type PredictAmount,
  type PredictSignedAmount,
  type PredictTimestamp,
} from '../types';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';

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
  expiresAt: '2099-03-01T12:00:30.000Z' as PredictTimestamp,
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
  expiresAt: '2099-03-01T12:00:30.000Z' as PredictTimestamp,
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
  overrides: Partial<PredictOrderReceipt>,
): PredictOrderReceipt => ({ ...receipt, ...overrides }) as PredictOrderReceipt;

const previewOrder = jest.fn<
  Promise<PredictOrderPreview>,
  [unknown, { signal?: AbortSignal }?]
>();
const ORDER_KEY = 'a1b2c3d4-1111-4222-8333-444455556666';
const commitSigning: PredictOrderCommitSigning = {
  step: 'submit',
  confirmed: true,
  inputs: {
    action: 'buy',
    outcome: 'yes',
    marketId: 'KXTEST-26-A',
    idempotencyKey: ORDER_KEY,
    amountCents: 400,
  },
  values: { price: '0.4500', count: '10.00' },
};
const lookupNext = {
  step: 'lookup' as const,
  values: { order_id: 'c1b2c3d4-1111-4222-8333-444455556666' },
};

const commitOrder = jest.fn<
  Promise<PredictOrderReceipt>,
  [string, PredictOrderCommitSigning, { signal?: AbortSignal }?]
>();
const invalidateQueries = jest.fn<Promise<void>, []>();
const trading = { previewOrder, commitOrder };

/** Every service a test builds; destroyed after each test so background
 * observation timers never leak into the next one. */
const services: PredictOrderService[] = [];
let rootMessenger: Messenger<
  MockAnyNamespace,
  PredictOrderServiceActions,
  PredictOrderServiceEvents
>;
const orderResolved = jest.fn();

const serviceWith = (
  observationDelayMs?: number,
  options: Partial<
    Pick<
      PredictOrderServiceOptions,
      | 'backgroundObservationDelaysMs'
      | 'backgroundObservationWindowMs'
      | 'ambiguousCommitGraceMs'
    >
  > = {},
) => {
  rootMessenger = new Messenger<
    MockAnyNamespace,
    PredictOrderServiceActions,
    PredictOrderServiceEvents
  >({ namespace: MOCK_ANY_NAMESPACE });
  orderResolved.mockReset();
  rootMessenger.subscribe('PredictOrderService:orderResolved', orderResolved);
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
  const created = new PredictOrderService({
    messenger,
    trading,
    venueId: KALSHI_VENUE_ID,
    ...(observationDelayMs === undefined ? {} : { observationDelayMs }),
    ...options,
  });
  services.push(created);
  return created;
};

beforeEach(() => {
  trading.previewOrder.mockReset();
  trading.previewOrder.mockResolvedValue(preview);
  trading.commitOrder.mockReset();
});

afterEach(() => {
  services.splice(0).forEach((created) => created.abandonCommits());
  jest.useRealTimers();
});

const service = () => serviceWith(0);

const buyQuoteParams = {
  marketId: 'KXTEST-26-A' as PredictEntityId,
  side: 'yes' as const,
  action: 'buy' as const,
  amount: '4.00' as PredictAmount,
  idempotencyKey: ORDER_KEY,
};
const sellQuoteParams = {
  marketId: 'KXTEST-26-A' as PredictEntityId,
  side: 'yes' as const,
  action: 'sell' as const,
  contracts: '70' as PredictAmount,
  idempotencyKey: ORDER_KEY,
};

/** Quotes `quote` so the service may commit it: a Commit is only ever sent
 * for a Preview this service quoted for the current Predict User. */
const quote = async (
  orderService: PredictOrderService,
  quoted: PredictOrderPreview = preview,
): Promise<PredictOrderService> => {
  trading.previewOrder.mockResolvedValueOnce(quoted);
  await orderService.requestQuote(
    KALSHI_VENUE_ID,
    quoted.action === 'buy' ? buyQuoteParams : sellQuoteParams,
  );
  return orderService;
};

/** A quoted service with no observation delay. */
const quotedService = (quoted: PredictOrderPreview = preview) =>
  quote(service(), quoted);

const commitSignal = { signal: expect.any(AbortSignal) };

/** Lets an observation loop on fake timers finish, and returns its result. */
const settleWithFakeTimers = async <T>(promise: Promise<T>): Promise<T> => {
  // Handled straight away, so a rejection is not reported as unhandled
  // while the timers run.
  const outcome = promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await jest.advanceTimersByTimeAsync(100);
  const settled = await outcome;
  if ('error' in settled) {
    throw settled.error;
  }
  return settled.value;
};

/** A canonical pre-operation failure: the backend body carried its code. */
const preOperationFailure = (code: PredictErrorCode, bodyCode: string) =>
  PredictError.from(code, { metadata: { status: 422, bodyCode } });

/** A failure that leaves the Commit ambiguous: no answer came back. */
const lostResponse = () => PredictError.from(PredictErrorCode.NETWORK_ERROR);

const balanceFilter = {
  queryKey: ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
};
const positionsFilter = {
  queryKey: ['PredictPortfolioService:getPositions', KALSHI_VENUE_ID],
};
const activityFilter = {
  queryKey: ['PredictPortfolioService:getActivity', KALSHI_VENUE_ID],
};
const summaryFilter = {
  queryKey: ['PredictPortfolioService:getPortfolioSummary', KALSHI_VENUE_ID],
};

describe('PredictOrderService', () => {
  it('requests a quote through the trading capability', async () => {
    const result = await service().requestQuote(
      KALSHI_VENUE_ID,
      buyQuoteParams,
    );

    expect(result).toBe(preview);
    expect(trading.previewOrder).toHaveBeenCalledWith(
      {
        marketId: 'KXTEST-26-A',
        side: 'yes',
        action: 'buy',
        amount: '4.00',
        idempotencyKey: ORDER_KEY,
      },
      { signal: expect.any(AbortSignal) },
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
      {
        marketId: 'KXTEST-26-A',
        side: 'yes',
        action: 'sell',
        contracts: '70',
        idempotencyKey: ORDER_KEY,
      },
      { signal: expect.any(AbortSignal) },
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

        const result = await (
          await quotedService()
        ).commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning);

        expect(result).toEqual(receiptWith({ status }));
        expect(trading.commitOrder).toHaveBeenCalledTimes(1);
        expect(invalidateQueries).toHaveBeenCalledTimes(4);
        expect(invalidateQueries).toHaveBeenNthCalledWith(1, balanceFilter);
        expect(invalidateQueries).toHaveBeenNthCalledWith(2, positionsFilter);
        expect(invalidateQueries).toHaveBeenNthCalledWith(3, activityFilter);
        expect(invalidateQueries).toHaveBeenNthCalledWith(4, summaryFilter);
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

        const result = await (
          await quotedService(sellPreview)
        ).commitPreview(KALSHI_VENUE_ID, 'preview-sell-1', commitSigning);

        expect(result.status).toBe(status);
        expect(trading.commitOrder).toHaveBeenCalledTimes(1);
        expect(invalidateQueries).toHaveBeenCalledTimes(4);
      },
    );

    it('observes an in-progress operation by re-POSTing the same commit', async () => {
      trading.commitOrder
        .mockResolvedValueOnce(receiptWith({ status: 'pending' }))
        .mockResolvedValueOnce(receiptWith({ status: 'submitted' }))
        .mockResolvedValueOnce(receiptWith({ status: 'filled' }));

      const result = await (
        await quotedService()
      ).commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning);

      expect(result).toEqual(receiptWith({ status: 'filled' }));
      expect(trading.commitOrder).toHaveBeenCalledTimes(3);
      // Every observation re-POSTs the same Preview reference: one operation.
      expect(trading.commitOrder).toHaveBeenCalledWith(
        'preview-1',
        commitSigning,
        commitSignal,
      );
    });

    it('follows the receipt step across the observation re-POSTs', async () => {
      trading.commitOrder
        .mockResolvedValueOnce(
          receiptWith({ status: 'pending', next: lookupNext }),
        )
        .mockResolvedValueOnce(
          receiptWith({
            status: 'submitted',
            next: { step: 'scan', values: { min_ts: 1_700_000_000 } },
          }),
        )
        .mockResolvedValueOnce(receiptWith({ status: 'filled' }));

      const result = await (
        await quotedService()
      ).commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning);

      expect(result).toEqual(receiptWith({ status: 'filled' }));
      expect(trading.commitOrder).toHaveBeenNthCalledWith(
        1,
        'preview-1',
        expect.objectContaining({ step: 'submit', confirmed: true }),
        commitSignal,
      );
      expect(trading.commitOrder).toHaveBeenNthCalledWith(
        2,
        'preview-1',
        expect.objectContaining({ step: 'lookup', confirmed: false }),
        commitSignal,
      );
      expect(trading.commitOrder).toHaveBeenNthCalledWith(
        3,
        'preview-1',
        expect.objectContaining({ step: 'scan', confirmed: false }),
        commitSignal,
      );
    });

    it('re-POSTs the step the last receipt named when the caller omits signing', async () => {
      trading.commitOrder
        .mockResolvedValueOnce(
          receiptWith({
            status: 'reconciliation_required',
            next: lookupNext,
          }),
        )
        .mockResolvedValueOnce(receiptWith({ status: 'filled' }));

      const orderService = await quotedService();
      await orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );

      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toEqual(receiptWith({ status: 'filled' }));
      expect(trading.commitOrder).toHaveBeenNthCalledWith(
        2,
        'preview-1',
        expect.objectContaining({
          step: 'lookup',
          confirmed: false,
          inputs: commitSigning.inputs,
        }),
        commitSignal,
      );
    });

    it('refuses a Commit that has nothing to sign', async () => {
      await expect(
        (await quotedService()).commitPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
      expect(trading.commitOrder).not.toHaveBeenCalled();
    });

    it('stops observing after a small bounded number of re-POSTs', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'pending' }));

      const result = await (
        await quotedService()
      ).commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning);

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

      const orderService = await quotedService();
      const first = await orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );

      expect(first).toEqual(receiptWith({ status: 'reconciliation_required' }));
      expect(trading.commitOrder).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledTimes(0);

      const second = await orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );

      expect(second).toEqual(receiptWith({ status: 'filled' }));
      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
      expect(invalidateQueries).toHaveBeenCalledTimes(4);
    });

    it('coalesces repeated commits of one operation into the in-flight commit', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'filled' }));

      const orderService = await quotedService();
      const [first, second] = await Promise.all([
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ]);

      expect(first).toBe(second);
      expect(trading.commitOrder).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledTimes(4);
    });

    it('shares rejections across coalesced calls and allows a fresh commit afterwards', async () => {
      trading.commitOrder.mockRejectedValueOnce(
        PredictError.from(PredictErrorCode.INVALID_RESPONSE),
      );
      trading.commitOrder.mockResolvedValueOnce(
        receiptWith({ status: 'filled' }),
      );

      const orderService = await quotedService();
      const settled = await Promise.allSettled([
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ]);
      const failures = settled.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );

      expect(failures).toHaveLength(2);
      expect(failures[0].reason).toBe(failures[1].reason);
      expect(trading.commitOrder).toHaveBeenCalledTimes(1);

      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).resolves.toEqual(receiptWith({ status: 'filled' }));
      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
    });

    it('propagates commit failures untouched', async () => {
      trading.commitOrder.mockRejectedValue(
        PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE),
      );

      await expect(
        (await quotedService()).commitPreview(
          KALSHI_VENUE_ID,
          'preview-1',
          commitSigning,
        ),
      ).rejects.toMatchObject({ code: PredictErrorCode.VENUE_UNAVAILABLE });
      expect(invalidateQueries).toHaveBeenCalledTimes(0);
    });
  });

  describe('abandonCommits', () => {
    /** A commit response the test releases when it chooses. */
    const deferredCommit = () => {
      let release: (value: PredictOrderReceipt) => void = () => undefined;
      trading.commitOrder.mockImplementation(
        () =>
          new Promise<PredictOrderReceipt>((resolve) => {
            release = resolve;
          }),
      );
      return { release: (value: PredictOrderReceipt) => release(value) };
    };

    /** Lets the observation loop reach its next re-POST. */
    const settle = async (): Promise<void> => {
      for (let tick = 0; tick < 20; tick += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    };

    it('rejects an in-flight commit immediately and ignores its late receipt', async () => {
      const pending = deferredCommit();
      const orderService = await quote(serviceWith(60_000));

      const commit = orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );
      await settle();
      orderService.abandonCommits();

      // Resolved straight away: the caller must not wait out the observation
      // delay, and must not receive a receipt the previous person caused.
      await expect(commit).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      expect(trading.commitOrder).toHaveBeenCalledTimes(1);

      // A terminal receipt would normally refresh the authoritative reads; a
      // reset just cleared them, so it must not repopulate them.
      pending.release(receiptWith({ status: 'filled' }));
      await settle();
      expect(invalidateQueries).toHaveBeenCalledTimes(0);
    });

    it('never re-POSTs an abandoned observation', async () => {
      trading.commitOrder.mockResolvedValueOnce(
        receiptWith({ status: 'pending' }),
      );
      const pending = deferredCommit();
      const orderService = await quotedService();

      const commit = orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );
      await settle();
      expect(trading.commitOrder).toHaveBeenCalledTimes(2);

      orderService.abandonCommits();
      await expect(commit).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });

      // The in-flight re-POST resolves after the abandonment: the loop stops
      // there instead of sending the previous person's Commit again.
      pending.release(receiptWith({ status: 'pending' }));
      await settle();
      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
      expect(invalidateQueries).toHaveBeenCalledTimes(0);
    });

    it('never commits a Preview quoted before the abandonment', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'filled' }));
      const orderService = await quotedService();

      orderService.abandonCommits();

      // The previous person's Preview: refused locally, so it can never be
      // POSTed with the next person's bearer token.
      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNAUTHENTICATED });
      expect(trading.commitOrder).toHaveBeenCalledTimes(0);
    });

    it('observes a Preview quoted after the abandonment normally', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'filled' }));
      const orderService = service();

      orderService.abandonCommits();
      await quote(orderService);

      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).resolves.toEqual(receiptWith({ status: 'filled' }));
      expect(invalidateQueries).toHaveBeenCalledTimes(4);
    });

    it('aborts the transport of a Commit still resolving its bearer token', async () => {
      let signal: AbortSignal | undefined;
      trading.commitOrder.mockImplementation(
        (_previewId, _signing, options) => {
          signal = options?.signal;
          return new Promise<PredictOrderReceipt>(() => undefined);
        },
      );
      const orderService = await quotedService();

      const commit = orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );
      expect(signal?.aborted).toBe(false);
      orderService.abandonCommits();

      await expect(commit).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      expect(signal?.aborted).toBe(true);
    });

    it('stops background observation and never notifies the previous person', async () => {
      jest.useFakeTimers();
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'pending' }));
      const orderService = await quote(
        serviceWith(0, { backgroundObservationDelaysMs: [1_000] }),
      );

      await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      );
      expect(trading.commitOrder).toHaveBeenCalledTimes(4);
      orderService.abandonCommits();
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'filled' }));
      await jest.advanceTimersByTimeAsync(60_000);

      expect(trading.commitOrder).toHaveBeenCalledTimes(4);
      expect(orderResolved).not.toHaveBeenCalled();
    });

    it('abandons in-flight commits when the service is destroyed', async () => {
      const pending = deferredCommit();
      const orderService = await quotedService();

      const commit = orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );
      await settle();
      orderService.destroy();

      await expect(commit).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      pending.release(receiptWith({ status: 'filled' }));
      await settle();
      expect(trading.commitOrder).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledTimes(0);
    });
  });
  describe('submission boundary', () => {
    it('refuses a Commit for a Preview it never quoted, without a request', async () => {
      await expect(
        service().commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNAUTHENTICATED });
      expect(trading.commitOrder).not.toHaveBeenCalled();
    });

    it('cancels a quoted Preview on a context change, so its Commit is refused locally', async () => {
      const orderService = await quotedService();

      orderService.cancelUncommittedPreviews();

      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).rejects.toMatchObject({ code: PredictErrorCode.PREVIEW_EXPIRED });
      expect(trading.commitOrder).not.toHaveBeenCalled();
    });

    it('aborts a quote in flight on a context change and never makes it approvable', async () => {
      let signal: AbortSignal | undefined;
      let resolveQuote: (value: PredictOrderPreview) => void = () => undefined;
      trading.previewOrder.mockImplementationOnce((_params, options) => {
        signal = options?.signal;
        return new Promise((resolve) => {
          resolveQuote = resolve;
        });
      });
      const orderService = service();

      const quoting = orderService.requestQuote(
        KALSHI_VENUE_ID,
        buyQuoteParams,
      );
      orderService.cancelUncommittedPreviews();
      expect(signal?.aborted).toBe(true);
      // Even a response that lands after the abort is refused.
      resolveQuote(preview);

      await expect(quoting).rejects.toMatchObject({
        code: PredictErrorCode.PREVIEW_EXPIRED,
      });
      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNAUTHENTICATED });
      expect(trading.commitOrder).not.toHaveBeenCalled();
    });

    it('aborts a quote when its caller aborts', async () => {
      let signal: AbortSignal | undefined;
      trading.previewOrder.mockImplementationOnce((_params, options) => {
        signal = options?.signal;
        return new Promise(() => undefined);
      });
      const caller = new AbortController();

      service()
        .requestQuote(KALSHI_VENUE_ID, buyQuoteParams, {
          signal: caller.signal,
        })
        .catch(() => undefined);
      caller.abort();

      expect(signal?.aborted).toBe(true);
    });

    it('never cancels a Commit already handed to the transport', async () => {
      let release: (value: PredictOrderReceipt) => void = () => undefined;
      trading.commitOrder.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      );
      const orderService = await quotedService();

      const commit = orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );
      // The boundary is crossed synchronously with the approval.
      expect(trading.commitOrder).toHaveBeenCalledWith(
        'preview-1',
        commitSigning,
        commitSignal,
      );
      orderService.cancelUncommittedPreviews();
      release(receiptWith({ status: 'filled' }));

      await expect(commit).resolves.toEqual(receiptWith({ status: 'filled' }));
      expect(invalidateQueries).toHaveBeenCalledTimes(4);
      expect(orderResolved).toHaveBeenCalledTimes(1);
    });

    it('lets a presented Preview that the backend proved unsubmitted be approved again, until a context change', async () => {
      trading.commitOrder.mockRejectedValueOnce(
        preOperationFailure(
          PredictErrorCode.INSUFFICIENT_BALANCE,
          'insufficient_balance',
        ),
      );
      trading.commitOrder.mockResolvedValueOnce(
        receiptWith({ status: 'filled' }),
      );
      const orderService = await quotedService();
      orderService.presentOperation('preview-1', jest.fn());

      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).rejects.toMatchObject({ code: PredictErrorCode.INSUFFICIENT_BALANCE });
      expect(orderResolved).not.toHaveBeenCalled();

      // Back before the boundary: a context change cancels it again.
      orderService.cancelUncommittedPreviews();
      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).rejects.toMatchObject({ code: PredictErrorCode.PREVIEW_EXPIRED });
      expect(trading.commitOrder).toHaveBeenCalledTimes(1);
    });

    it('resolves an unpresented operation the backend refused as not placed', async () => {
      trading.commitOrder.mockRejectedValueOnce(
        preOperationFailure(
          PredictErrorCode.INSUFFICIENT_BALANCE,
          'insufficient_balance',
        ),
      );
      const orderService = await quotedService();

      await expect(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).rejects.toMatchObject({ code: PredictErrorCode.INSUFFICIENT_BALANCE });

      expect(orderResolved).toHaveBeenCalledTimes(1);
      expect(orderResolved).toHaveBeenCalledWith({
        venueId: KALSHI_VENUE_ID,
        previewId: 'preview-1',
        outcome: {
          status: 'not_placed',
          code: PredictErrorCode.INSUFFICIENT_BALANCE,
        },
        presented: false,
      });
    });
  });

  describe('orderResolved', () => {
    it('is published once per operation, however often it is re-committed', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'filled' }));
      const orderService = await quotedService();

      await orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );
      await orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );

      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
      expect(orderResolved).toHaveBeenCalledTimes(1);
      expect(orderResolved).toHaveBeenCalledWith({
        venueId: KALSHI_VENUE_ID,
        previewId: 'preview-1',
        outcome: {
          status: 'settled',
          receipt: receiptWith({ status: 'filled' }),
        },
        presented: false,
      });
    });

    it('reaches the presenting surface and is published as presented', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'filled' }));
      const presenter = jest.fn();
      const orderService = await quotedService();
      orderService.presentOperation('preview-1', presenter);

      await orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );

      expect(presenter).toHaveBeenCalledWith({
        venueId: KALSHI_VENUE_ID,
        previewId: 'preview-1',
        outcome: {
          status: 'settled',
          receipt: receiptWith({ status: 'filled' }),
        },
      });
      expect(orderResolved).toHaveBeenCalledWith(
        expect.objectContaining({ presented: true }),
      );
    });

    it('is published as not presented once the surface unregisters', async () => {
      let release: (value: PredictOrderReceipt) => void = () => undefined;
      trading.commitOrder.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      );
      const presenter = jest.fn();
      const orderService = await quotedService();
      const unregister = orderService.presentOperation('preview-1', presenter);

      const commit = orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );
      unregister();
      release(receiptWith({ status: 'filled' }));
      await commit;

      expect(presenter).not.toHaveBeenCalled();
      expect(orderResolved).toHaveBeenCalledWith(
        expect.objectContaining({ presented: false }),
      );
    });

    it('carries operation references and the canonical receipt only', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'filled' }));
      const orderService = await quotedService();

      await orderService.commitPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        commitSigning,
      );

      const [payload] = orderResolved.mock.calls[0];
      expect(Object.keys(payload).sort()).toEqual([
        'outcome',
        'presented',
        'previewId',
        'venueId',
      ]);
    });
  });

  describe('background observation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('keeps observing an operation still in progress after the bounded loop, and notifies once', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'pending' }));
      const orderService = await quote(
        serviceWith(0, { backgroundObservationDelaysMs: [1_000] }),
      );

      const first = await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      );
      expect(first.status).toBe('pending');
      expect(trading.commitOrder).toHaveBeenCalledTimes(4);

      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'filled' }));
      await jest.advanceTimersByTimeAsync(1_000);

      expect(trading.commitOrder).toHaveBeenCalledTimes(5);
      expect(trading.commitOrder).toHaveBeenLastCalledWith(
        'preview-1',
        commitSigning,
        commitSignal,
      );
      expect(orderResolved).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledTimes(4);

      // Resolved: nothing is observed any more.
      await jest.advanceTimersByTimeAsync(60_000);
      expect(trading.commitOrder).toHaveBeenCalledTimes(5);
      expect(orderResolved).toHaveBeenCalledTimes(1);
    });

    it('keeps observing a reconciliation_required operation', async () => {
      trading.commitOrder.mockResolvedValueOnce(
        receiptWith({ status: 'reconciliation_required' }),
      );
      trading.commitOrder.mockResolvedValueOnce(
        receiptWith({ status: 'filled' }),
      );
      const orderService = await quote(
        serviceWith(0, { backgroundObservationDelaysMs: [1_000] }),
      );

      await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      );
      await jest.advanceTimersByTimeAsync(1_000);

      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
      expect(orderResolved).toHaveBeenCalledTimes(1);
    });

    it('waits until the Preview has expired before re-POSTing a Commit that returned no receipt', async () => {
      jest.setSystemTime(Date.parse(preview.expiresAt) - 10_000);
      trading.commitOrder.mockRejectedValueOnce(lostResponse());
      trading.commitOrder.mockResolvedValueOnce(
        receiptWith({ status: 'filled' }),
      );
      const orderService = await quote(
        serviceWith(0, {
          backgroundObservationDelaysMs: [1_000],
          ambiguousCommitGraceMs: 5_000,
        }),
      );

      await expect(
        settleWithFakeTimers(
          orderService.commitPreview(
            KALSHI_VENUE_ID,
            'preview-1',
            commitSigning,
          ),
        ),
      ).rejects.toMatchObject({ code: PredictErrorCode.NETWORK_ERROR });

      // Inside the validity window an automatic re-POST could place the
      // Order, so nothing is sent.
      await jest.advanceTimersByTimeAsync(14_000);
      expect(trading.commitOrder).toHaveBeenCalledTimes(1);

      // After expiry plus grace the re-POST can only observe.
      await jest.advanceTimersByTimeAsync(1_000);
      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
      expect(trading.commitOrder).toHaveBeenLastCalledWith(
        'preview-1',
        commitSigning,
        commitSignal,
      );
      expect(orderResolved).toHaveBeenCalledTimes(1);
      expect(orderResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: {
            status: 'settled',
            receipt: receiptWith({ status: 'filled' }),
          },
        }),
      );
    });

    it('resolves an ambiguous Commit as not placed when the post-expiry observation finds no operation', async () => {
      jest.setSystemTime(Date.parse(preview.expiresAt) - 10_000);
      trading.commitOrder.mockRejectedValueOnce(lostResponse());
      trading.commitOrder.mockRejectedValueOnce(
        preOperationFailure(
          PredictErrorCode.PREVIEW_EXPIRED,
          'preview_expired',
        ),
      );
      const orderService = await quote(
        serviceWith(0, {
          backgroundObservationDelaysMs: [1_000],
          ambiguousCommitGraceMs: 5_000,
        }),
      );

      await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).catch(() => undefined);
      await jest.advanceTimersByTimeAsync(15_000);

      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
      expect(orderResolved).toHaveBeenCalledTimes(1);
      expect(orderResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: {
            status: 'not_placed',
            code: PredictErrorCode.PREVIEW_EXPIRED,
          },
        }),
      );
      await jest.advanceTimersByTimeAsync(60_000);
      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
    });

    it('does not conclude "not placed" from a post-expiry 401 after an ambiguous Commit', async () => {
      jest.setSystemTime(Date.parse(preview.expiresAt) - 10_000);
      trading.commitOrder.mockRejectedValueOnce(lostResponse());
      // The auth guard (or a token the client could not get, e.g. a locked
      // wallet) answers before the Commit route looks the operation up.
      trading.commitOrder.mockRejectedValueOnce(
        PredictError.from(PredictErrorCode.UNAUTHENTICATED, {
          metadata: { status: 401 },
        }),
      );
      trading.commitOrder.mockResolvedValueOnce(
        receiptWith({ status: 'filled' }),
      );
      const orderService = await quote(
        serviceWith(0, {
          backgroundObservationDelaysMs: [1_000],
          ambiguousCommitGraceMs: 5_000,
        }),
      );

      await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).catch(() => undefined);
      await jest.advanceTimersByTimeAsync(15_000);
      expect(trading.commitOrder).toHaveBeenCalledTimes(2);
      expect(orderResolved).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1_000);
      expect(trading.commitOrder).toHaveBeenCalledTimes(3);
      expect(orderResolved).toHaveBeenCalledTimes(1);
      expect(orderResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: expect.objectContaining({ status: 'settled' }),
        }),
      );
    });

    it('never concludes "not placed" once a Receipt has been seen', async () => {
      jest.setSystemTime(Date.parse(preview.expiresAt) - 10_000);
      // The bounded loop (one Commit, three re-POSTs) sees the operation in
      // progress.
      for (let call = 0; call < 4; call += 1) {
        trading.commitOrder.mockResolvedValueOnce(
          receiptWith({ status: 'pending' }),
        );
      }
      // A post-expiry refusal cannot unmake an operation a Receipt proved.
      trading.commitOrder.mockRejectedValueOnce(
        preOperationFailure(
          PredictErrorCode.PREVIEW_EXPIRED,
          'preview_expired',
        ),
      );
      trading.commitOrder.mockResolvedValueOnce(
        receiptWith({ status: 'filled' }),
      );
      const orderService = await quote(
        serviceWith(0, {
          backgroundObservationDelaysMs: [20_000],
          ambiguousCommitGraceMs: 5_000,
        }),
      );

      await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      );
      expect(trading.commitOrder).toHaveBeenCalledTimes(4);
      await jest.advanceTimersByTimeAsync(20_000);
      expect(trading.commitOrder).toHaveBeenCalledTimes(5);
      expect(orderResolved).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(20_000);
      expect(trading.commitOrder).toHaveBeenCalledTimes(6);
      expect(orderResolved).toHaveBeenCalledTimes(1);
      expect(orderResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: expect.objectContaining({ status: 'settled' }),
        }),
      );
    });

    it('does not conclude "not placed" from a refusal inside the validity window after an ambiguous Commit', async () => {
      jest.setSystemTime(Date.parse(preview.expiresAt) - 10_000);
      trading.commitOrder.mockRejectedValueOnce(lostResponse());
      // The Predict User re-approves straight away; the first request may
      // still be landing, so this refusal is not conclusive.
      trading.commitOrder.mockRejectedValueOnce(
        preOperationFailure(
          PredictErrorCode.INSUFFICIENT_BALANCE,
          'insufficient_balance',
        ),
      );
      trading.commitOrder.mockResolvedValueOnce(
        receiptWith({ status: 'filled' }),
      );
      const orderService = await quote(
        serviceWith(0, {
          backgroundObservationDelaysMs: [1_000],
          ambiguousCommitGraceMs: 5_000,
        }),
      );

      await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).catch(() => undefined);
      await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      ).catch(() => undefined);
      expect(orderResolved).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(15_000);
      expect(trading.commitOrder).toHaveBeenCalledTimes(3);
      expect(orderResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: expect.objectContaining({ status: 'settled' }),
        }),
      );
    });

    it('coalesces an explicit Keep checking with a background observation', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'pending' }));
      const orderService = await quote(
        serviceWith(0, { backgroundObservationDelaysMs: [1_000] }),
      );
      await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      );
      expect(trading.commitOrder).toHaveBeenCalledTimes(4);

      // An explicit observation pre-empts the scheduled background one.
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'filled' }));
      await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      );
      await jest.advanceTimersByTimeAsync(60_000);

      expect(trading.commitOrder).toHaveBeenCalledTimes(5);
      expect(orderResolved).toHaveBeenCalledTimes(1);
    });

    it('stops observing at the end of its window and leaves the outcome to the reads', async () => {
      trading.commitOrder.mockResolvedValue(receiptWith({ status: 'pending' }));
      const orderService = await quote(
        serviceWith(0, {
          backgroundObservationDelaysMs: [1_000],
          backgroundObservationWindowMs: 3_500,
        }),
      );

      await settleWithFakeTimers(
        orderService.commitPreview(KALSHI_VENUE_ID, 'preview-1', commitSigning),
      );
      await jest.advanceTimersByTimeAsync(60_000);

      // A few background observations fit in the window; none after it.
      const calls = trading.commitOrder.mock.calls.length;
      await jest.advanceTimersByTimeAsync(60_000);
      expect(trading.commitOrder.mock.calls.length).toBe(calls);
      // The bounded loop's 4, then one re-POST per background tick.
      expect(calls).toBe(8);
      expect(orderResolved).not.toHaveBeenCalled();
    });
  });
});
