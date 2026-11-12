import Logger from '../../../../util/Logger';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { PredictError, PredictErrorCode } from '../errors';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import type {
  PredictOrderPreview,
  PredictUnresolvedOrder,
  PredictOrderReceipt,
  PredictAmount,
  PredictDecimal,
  PredictEntityId,
  PredictSignedAmount,
  PredictTimestamp,
} from '../types';
import {
  MISSING_OPERATION_EXPIRY_GRACE_MS,
  PredictOrderService,
  type PredictOrderServiceActions,
  type PredictOrderServiceEvents,
  type PredictOrderServiceOptions,
  type PredictOrderServiceMessenger,
} from './PredictOrderService';
import {
  createOrderDispatchJournal,
  type OrderDispatchJournal,
} from './internal/orderDispatchJournal';

// ES2022 has no Promise.withResolvers; keep test barriers explicit.
const deferred = <Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value | PromiseLike<Value>) => void;
} => {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const preview: PredictOrderPreview = {
  previewId: 'preview-one',
  venueId: KALSHI_VENUE_ID,
  marketId: 'market-one' as PredictEntityId,
  side: 'yes',
  action: 'buy',
  requestedAmount: '4.00' as PredictAmount,
  orderAmount: '4.00' as PredictAmount,
  estimatedContracts: 10,
  averagePrice: '0.40' as PredictDecimal,
  limitPrice: '0.40' as PredictDecimal,
  fee: '0' as PredictAmount,
  feeBreakdown: [],
  totalDebit: '4.00' as PredictAmount,
  potentialPayout: '10' as PredictAmount,
  potentialProfit: '6' as PredictSignedAmount,
  expiresAt: '2099-01-01T00:00:00.000Z' as PredictTimestamp,
};
const receipt = {
  operationId: 'operation-one',
  previewId: 'preview-one',
  venueId: KALSHI_VENUE_ID,
  marketId: 'market-one',
  side: 'yes',
  action: 'buy',
  status: 'filled',
  quotedContracts: 10,
  requestedMaxSpend: '4',
  venueOrderId: 'venue-one',
  filledContracts: '10',
  actualSpend: '4',
  averageFillPrice: '0.40',
  fee: '0',
  payoutExposure: '10',
} as PredictOrderReceipt;
const signing = { kind: 'user-approved' as const };
const reference = {
  identityScope: 'user-one',
  venueId: KALSHI_VENUE_ID,
  previewId: 'preview-one',
  dispatchedAt: 1,
  recoveryState: 'unresolved' as const,
};
const memory = (): {
  getItem: jest.Mock<Promise<string | null>, []>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
  removeItem: jest.Mock<Promise<void>, []>;
} => {
  let raw: string | null = null;
  return {
    getItem: jest.fn(async () => raw),
    setItem: jest.fn(async (_key: string, value: string) => {
      raw = value;
    }),
    removeItem: jest.fn(async () => {
      raw = null;
    }),
  };
};
const instances: PredictOrderService[] = [];
const setup = (
  journal: OrderDispatchJournal,
  options: Partial<PredictOrderServiceOptions> = {},
): {
  service: PredictOrderService;
  trading: {
    previewOrder: jest.Mock;
    reviewOrder: jest.Mock;
    invalidatePreviews: jest.Mock;
    commitOrder: jest.Mock;
    observeOrder: jest.Mock;
    listUnresolvedOrders: jest.Mock;
  };
  resolved: jest.Mock;
  invalidated: jest.Mock;
  recoveryChanged: jest.Mock;
} => {
  const root = new Messenger<
    MockAnyNamespace,
    PredictOrderServiceActions,
    PredictOrderServiceEvents
  >({ namespace: MOCK_ANY_NAMESPACE });
  const messenger: PredictOrderServiceMessenger = new Messenger({
    namespace: 'PredictOrderService',
    parent: root,
  });
  const invalidated = jest.fn().mockResolvedValue(undefined);
  const resolved = jest.fn();
  root.registerActionHandler(
    'PredictPortfolioService:invalidateQueries',
    invalidated,
  );
  root.delegate({
    messenger,
    actions: ['PredictPortfolioService:invalidateQueries'],
    events: [],
  });
  root.subscribe('PredictOrderService:orderResolved', resolved);
  const recoveryChanged = jest.fn();
  root.subscribe('PredictOrderService:recoveryChanged', recoveryChanged);
  const trading = {
    previewOrder: jest.fn().mockResolvedValue(preview),
    reviewOrder: jest.fn().mockResolvedValue({
      previewId: preview.previewId,
      maxCost: '4.20',
      contracts: '10.00',
      payout: '10.00',
      proceedsIfFullyFilled: '3.80',
    }),
    invalidatePreviews: jest.fn(),
    commitOrder: jest.fn().mockResolvedValue(receipt),
    observeOrder: jest
      .fn()
      .mockRejectedValue(
        PredictError.from(PredictErrorCode.ORDER_OUTCOME_UNKNOWN),
      ),
    listUnresolvedOrders: jest.fn().mockResolvedValue({ operations: [] }),
  };
  const service = new PredictOrderService({
    messenger,
    trading,
    venueId: KALSHI_VENUE_ID,
    journal,
    observationDelayMs: 0,
    backgroundObservationDelaysMs: [10],
    maxBackgroundObservations: 4,
    ...options,
  });
  instances.push(service);
  return { service, trading, resolved, invalidated, recoveryChanged };
};
const quote = async (service: PredictOrderService): Promise<PredictOrderPreview> => {
  const quoted = await service.requestQuote(KALSHI_VENUE_ID, {
    marketId: preview.marketId,
    side: 'yes',
    action: 'buy',
    amount: '4' as never,
    idempotencyKey: 'client-key',
  });
  await service.reviewPreview(KALSHI_VENUE_ID, quoted.previewId);
  return quoted;
};

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  instances.splice(0).forEach((service) => service.destroy());
  jest.useRealTimers();
});

describe('Predict order durable recovery', () => {
  it('hard-resets a suspended POST when a different identity resumes', async () => {
    const journal = createOrderDispatchJournal(memory());
    const { service, trading, resolved, invalidated } = setup(journal);
    await service.resumeRecovery('user-one');
    await quote(service);
    const held = deferred<PredictOrderReceipt>();
    const sent = deferred<void>();
    let signal: AbortSignal | undefined;
    trading.commitOrder.mockImplementationOnce((_id, _approval, options) => {
      signal = options.signal;
      sent.resolve();
      return held.promise;
    });
    const pending = service.commitPreview(KALSHI_VENUE_ID, preview.previewId, signing).catch((error: unknown) => error);
    await sent.promise;
    service.suspendRecovery();
    await pending;
    expect(signal?.aborted).toBe(false);
    await service.resumeRecovery('user-two');
    expect(signal?.aborted).toBe(true);
    held.resolve(receipt);
    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    expect(invalidated).not.toHaveBeenCalled();
    expect(trading.observeOrder).not.toHaveBeenCalled();
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(1);
  });

  it('keeps dispatched commits unknown across suspend and resumes with GET only', async () => {
    const journal = createOrderDispatchJournal(memory());
    const { service, trading, resolved, invalidated } = setup(journal);
    await service.resumeRecovery('user-one');
    await quote(service);
    const held = deferred<PredictOrderReceipt>();
    const sent = deferred<void>();
    let signal: AbortSignal | undefined;
    trading.commitOrder.mockImplementationOnce((_id, _approval, options) => {
      signal = options.signal;
      sent.resolve();
      return held.promise;
    });
    const pending = service.commitPreview(KALSHI_VENUE_ID, preview.previewId, signing);
    const rejection = pending.catch((error: unknown) => error);
    await sent.promise;
    const generation = service.getRecoveryGeneration();
    service.suspendRecovery();
    expect(await rejection).toMatchObject({
      code: PredictErrorCode.ORDER_OUTCOME_UNKNOWN,
      metadata: { phase: 'commit', mutationRelay: 'unknown', causeCode: PredictErrorCode.UNAUTHENTICATED },
    });
    expect(signal?.aborted).toBe(false);
    expect(service.getRecoveryGeneration()).toBe(generation);
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([
      expect.objectContaining({ recoveryState: 'unresolved', expiresAt: Date.parse(preview.expiresAt) }),
    ]);
    expect(service.getRecovery(KALSHI_VENUE_ID)).toEqual([{ previewId: preview.previewId, status: 'checking' }]);
    await expect(service.commitPreview(KALSHI_VENUE_ID, preview.previewId, signing)).rejects.toMatchObject({ code: PredictErrorCode.ORDER_OUTCOME_UNKNOWN });
    held.resolve(receipt);
    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    expect(invalidated).not.toHaveBeenCalled();
    trading.observeOrder.mockResolvedValue(receipt);
    await service.resumeRecovery('user-one');
    await service.commitPreview(KALSHI_VENUE_ID, preview.previewId, signing);
    expect(trading.commitOrder).toHaveBeenCalledTimes(1);
    expect(trading.observeOrder).toHaveBeenCalledTimes(2);
    expect(resolved).toHaveBeenCalledTimes(1);
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([]);
  });

  it('requires a fresh missing-operation GET after backend expiry plus grace to resolve not placed', async () => {
    const journal = createOrderDispatchJournal(memory());
    const expiresAt = Date.now() + 30_000;
    await journal.put({ ...reference, expiresAt });
    const { service, trading, resolved } = setup(journal, { maxBackgroundObservations: 2 });
    const missing = PredictError.from(PredictErrorCode.ORDER_OUTCOME_UNKNOWN, {
      metadata: { phase: 'observe', bodyCode: 'operation_not_found', mutationRelay: 'not_a_mutation' },
    });
    trading.observeOrder.mockRejectedValue(missing);
    await service.resumeRecovery('user-one');
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(1);
    jest.setSystemTime(expiresAt + MISSING_OPERATION_EXPIRY_GRACE_MS);
    const held = deferred<PredictOrderReceipt>();
    const started = deferred<void>();
    trading.observeOrder.mockImplementationOnce(() => { started.resolve(); return held.promise; });
    const recovering = service.resumeRecovery('user-one');
    await started.promise;
    jest.setSystemTime(Date.now() + 1);
    held.resolve(Promise.reject(missing));
    await recovering;
    expect(resolved).not.toHaveBeenCalled();
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(1);
    await service.resumeRecovery('user-one');
    expect(resolved).toHaveBeenCalledWith(expect.objectContaining({
      outcome: { status: 'not_placed', code: PredictErrorCode.PREVIEW_EXPIRED },
    }));
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([]);
    expect(trading.commitOrder).not.toHaveBeenCalled();
  });

  it.each(['network', 'missing-expiry', 'receipt-exists'] as const)('never prunes unknown %s outcomes based on age alone', async (kind) => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put({ ...reference, ...(kind === 'missing-expiry' ? {} : { expiresAt: Date.now() - 60_000 }) });
    const { service, trading, resolved } = setup(journal);
    trading.observeOrder.mockRejectedValue(PredictError.from(PredictErrorCode.ORDER_OUTCOME_UNKNOWN, {
      metadata: { phase: 'observe', bodyCode: kind === 'network' ? 'network_error' : 'operation_not_found' },
    }));
    if (kind === 'receipt-exists') {
      trading.listUnresolvedOrders.mockResolvedValueOnce({ operations: [{
        previewId: preview.previewId, createdAt: '2026-01-01T00:00:00.000Z', submittedAt: null,
        receipt: { ...receipt, status: 'reconciliation_required' },
      }] });
    }
    await service.resumeRecovery('user-one');
    expect(resolved).not.toHaveBeenCalled();
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(1);
  });

  it('persists before POST and after restart observes a lost accepted response without another POST', async () => {
    const storage = memory();
    const journal = createOrderDispatchJournal(storage);
    const first = setup(journal);
    await first.service.resumeRecovery('user-one');
    await quote(first.service);
    first.trading.commitOrder.mockImplementationOnce(async () => {
      expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([
        expect.objectContaining({
          previewId: preview.previewId,
          recoveryState: 'unresolved',
        }),
      ]);
      throw new TypeError('accepted response lost');
    });
    await expect(
      first.service.commitPreview(KALSHI_VENUE_ID, preview.previewId, signing),
    ).rejects.toMatchObject({ code: 'ORDER_OUTCOME_UNKNOWN' });
    expect(first.trading.commitOrder).toHaveBeenCalledTimes(1);
    first.service.destroy();
    const restarted = setup(createOrderDispatchJournal(storage));
    restarted.trading.observeOrder.mockResolvedValueOnce(receipt);
    await restarted.service.resumeRecovery('user-one');
    expect(restarted.trading.observeOrder).toHaveBeenCalledWith(
      preview.previewId,
      expect.anything(),
    );
    expect(restarted.trading.commitOrder).not.toHaveBeenCalled();
    expect(restarted.resolved).toHaveBeenCalledTimes(1);
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([]);
    restarted.service.destroy();
    const again = setup(createOrderDispatchJournal(storage));
    await again.service.resumeRecovery('user-one');
    expect(again.resolved).not.toHaveBeenCalled();
    expect(again.trading.observeOrder).not.toHaveBeenCalled();
  });

  it('retains a pre-row dispatch through 404 and offline deadline, then finds a late fill', async () => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put(reference);
    const { service, trading, resolved } = setup(journal, {
      maxBackgroundObservations: 2,
    });
    await service.resumeRecovery('user-one');
    expect(service.getRecovery(KALSHI_VENUE_ID)).toEqual([
      { previewId: 'preview-one', status: 'checking' },
    ]);
    expect(resolved).not.toHaveBeenCalled();
    service.suspendRecovery();
    jest.setSystemTime(Date.now() + 50 * 60_000);
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(1);
    trading.observeOrder.mockResolvedValueOnce(receipt);
    await service.resumeRecovery('user-one');
    expect(resolved).toHaveBeenCalledTimes(1);
    expect(trading.commitOrder).not.toHaveBeenCalled();
  });

  it('merges paginated server discovery with the journal and includes manual review without scanning it', async () => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put(reference);
    const { service, trading } = setup(journal, {
      maxBackgroundObservations: 8,
    });
    const entry = (
      previewId: string,
      status: PredictOrderReceipt['status'] = 'reconciliation_required',
    ): PredictUnresolvedOrder => ({
      previewId,
      createdAt: '2026-01-01T00:00:00.000Z' as PredictTimestamp,
      submittedAt: null,
      receipt: { ...receipt, previewId, status },
    });
    trading.listUnresolvedOrders
      .mockResolvedValueOnce({
        operations: [entry('preview-one')],
        nextCursor: 'next-page',
      })
      .mockResolvedValueOnce({
        operations: [
          entry('other-device'),
          entry('manual', 'needs_manual_review'),
        ],
      });
    await service.resumeRecovery('user-one');
    await jest.advanceTimersByTimeAsync(10);
    expect(trading.listUnresolvedOrders).toHaveBeenNthCalledWith(
      2,
      { cursor: 'next-page', limit: 25 },
      expect.anything(),
    );
    expect(
      (await journal.list('user-one', KALSHI_VENUE_ID))
        .map((item) => item.previewId)
        .sort(),
    ).toEqual(['other-device', 'preview-one']);
    expect(service.getRecovery(KALSHI_VENUE_ID)).toContainEqual({
      previewId: 'manual',
      status: 'needs_manual_review',
    });
    expect(
      trading.observeOrder.mock.calls.some(([id]) => id === 'manual'),
    ).toBe(false);
    expect(trading.commitOrder).not.toHaveBeenCalled();
  });

  it('coalesces duplicate resume and explicit refresh while an observation is in flight', async () => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put(reference);
    const { service, trading } = setup(journal);
    const held = deferred<PredictOrderReceipt>();
    const started = deferred<void>();
    trading.observeOrder.mockImplementationOnce(() => {
      started.resolve();
      return held.promise;
    });
    const first = service.resumeRecovery('user-one');
    await started.promise;
    const second = service.resumeRecovery('user-one');
    const explicit = service.refreshRecovery(KALSHI_VENUE_ID);
    expect(second).toBe(first);
    expect(explicit).toBe(first);
    held.resolve(receipt);
    await first;
    expect(trading.observeOrder).toHaveBeenCalledTimes(1);
  });

  it('pauses a fair session at its call budget and a later resume observes the next operation', async () => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put(reference);
    await journal.put({ ...reference, previewId: 'preview-two' });
    const { service, trading } = setup(journal, {
      maxBackgroundObservations: 2,
    });
    await service.resumeRecovery('user-one');
    expect(trading.observeOrder.mock.calls.map(([id]) => id)).toEqual([
      'preview-one',
    ]);
    await jest.advanceTimersByTimeAsync(1000);
    expect(trading.observeOrder).toHaveBeenCalledTimes(1);
    await service.resumeRecovery('user-one');
    expect(trading.observeOrder.mock.calls.map(([id]) => id)).toEqual([
      'preview-one',
      'preview-two',
    ]);
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(2);
  });

  it('pauses on rate limit until a later resume without losing unknown references', async () => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put(reference);
    const { service, trading } = setup(journal);
    trading.observeOrder.mockRejectedValueOnce(
      PredictError.from(PredictErrorCode.RATE_LIMITED),
    );
    await service.resumeRecovery('user-one');
    await jest.advanceTimersByTimeAsync(1000);
    expect(trading.observeOrder).toHaveBeenCalledTimes(1);
    trading.observeOrder.mockResolvedValueOnce(receipt);
    await service.resumeRecovery('user-one');
    expect(trading.observeOrder).toHaveBeenCalledTimes(2);
  });

  it('isolates another user and fences a receipt completing after lock', async () => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put(reference);
    const { service, trading, resolved, invalidated } = setup(journal);
    const held = deferred<PredictOrderReceipt>();
    const started = deferred<void>();
    trading.observeOrder.mockImplementationOnce(() => {
      started.resolve();
      return held.promise;
    });
    const recovering = service.resumeRecovery('user-one');
    await started.promise;
    service.suspendRecovery();
    held.resolve(receipt);
    await recovering;
    expect(resolved).not.toHaveBeenCalled();
    expect(invalidated).not.toHaveBeenCalled();
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(1);
    await service.resumeRecovery('user-two');
    expect(service.getRecovery(KALSHI_VENUE_ID)).toEqual([]);
    expect(trading.observeOrder).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch if journal persistence fails and reset clears durable references', async () => {
    const journal = createOrderDispatchJournal(memory());
    const { service, trading } = setup(journal);
    await service.resumeRecovery('user-one');
    await quote(service);
    jest.spyOn(journal, 'put').mockRejectedValueOnce(new Error('disk full'));
    await expect(
      service.commitPreview(KALSHI_VENUE_ID, preview.previewId, signing),
    ).rejects.toMatchObject({
      metadata: { mutationRelay: 'not_relayed_this_invocation' },
    });
    expect(trading.commitOrder).not.toHaveBeenCalled();
    await journal.put(reference);
    await service.reset();
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([]);
  });
  it('retains read-budget deferrals and continues later observations without approval', async () => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put(reference);
    const { service, trading } = setup(journal, {
      maxBackgroundObservations: 2,
    });
    trading.observeOrder.mockRejectedValueOnce(
      PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE, {
        metadata: {
          bodyCode: 'venue_read_budget_exhausted',
          requestSent: true,
          phase: 'observe',
        },
      }),
    );
    await service.resumeRecovery('user-one');
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(1);
    trading.observeOrder.mockResolvedValueOnce(receipt);
    await service.resumeRecovery('user-one');
    expect(trading.observeOrder).toHaveBeenCalledTimes(2);
    expect(trading.commitOrder).not.toHaveBeenCalled();
  });

  it('never POSTs when lock occurs during the required pre-dispatch journal write', async () => {
    const storage = memory();
    const journal = createOrderDispatchJournal(storage);
    const { service, trading } = setup(journal);
    await service.resumeRecovery('user-one');
    await quote(service);
    const entered = deferred<void>();
    const release = deferred<void>();
    const save = storage.setItem.getMockImplementation();
    storage.setItem.mockImplementationOnce(async (key, value) => {
      entered.resolve();
      await release.promise;
      await save?.(key, value);
    });
    const pending = service.commitPreview(
      KALSHI_VENUE_ID,
      preview.previewId,
      signing,
    );
    const rejection = pending.then(
      () => undefined,
      (error: unknown) => error,
    );
    await entered.promise;
    service.suspendRecovery();
    release.resolve();
    expect(await rejection).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(trading.commitOrder).not.toHaveBeenCalled();
    // Conservative journal references can outlive a cancelled preparation;
    // recovery still cannot turn one into a mutation.
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(1);
  });

  it('surfaces server-confirmed manual review before pruning and rediscovers it after restart', async () => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put({ ...reference, recoveryState: 'manual_review' });
    const { service, trading, resolved, recoveryChanged } = setup(journal);
    const logged = jest.spyOn(Logger, 'log');
    trading.listUnresolvedOrders.mockResolvedValue({
      operations: [
        {
          previewId: reference.previewId,
          receipt: { ...receipt, status: 'needs_manual_review' },
          createdAt: '2026-01-01T00:00:00.000Z',
          submittedAt: null,
        },
      ],
    });
    const remove = journal.remove;
    jest.spyOn(journal, 'remove').mockImplementation(async (...args) => {
      expect(service.getRecovery(KALSHI_VENUE_ID)).toContainEqual({ previewId: reference.previewId, status: 'needs_manual_review' });
      expect(recoveryChanged).toHaveBeenCalledWith({
        venueId: KALSHI_VENUE_ID,
        operations: [{ previewId: reference.previewId, status: 'needs_manual_review' }],
      });
      await remove(...args);
    });
    await service.resumeRecovery('user-one');
    expect(service.getRecovery(KALSHI_VENUE_ID)).toEqual([
      { previewId: reference.previewId, status: 'needs_manual_review' },
    ]);
    expect(trading.observeOrder).not.toHaveBeenCalled();
    expect(resolved).not.toHaveBeenCalled();
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(0);
    jest.mocked(journal.remove).mockRestore();
    service.destroy();
    const restarted = setup(journal);
    restarted.trading.listUnresolvedOrders.mockResolvedValueOnce(await trading.listUnresolvedOrders());
    await restarted.service.resumeRecovery('user-one');
    expect(restarted.service.getRecovery(KALSHI_VENUE_ID)).toEqual([
      { previewId: reference.previewId, status: 'needs_manual_review' },
    ]);
    expect(restarted.trading.observeOrder).not.toHaveBeenCalled();
    expect(restarted.trading.commitOrder).not.toHaveBeenCalled();
    expect(logged.mock.calls.filter(([message]) => message === 'PredictNext: pruned terminal order review')).toEqual([
      ['PredictNext: pruned terminal order review', { previewId: reference.previewId, reason: 'server_confirmed_needs_manual_review_surfaced' }],
      ['PredictNext: pruned terminal order review', { previewId: reference.previewId, reason: 'server_confirmed_needs_manual_review_surfaced' }],
    ]);
    logged.mockRestore();
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([]);
  });

  it('pauses at the session deadline without removing old unresolved references', async () => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put(reference);
    const { service, trading } = setup(journal, {
      backgroundObservationWindowMs: 5,
    });
    await service.resumeRecovery('user-one');
    await jest.advanceTimersByTimeAsync(100);
    expect(trading.observeOrder).toHaveBeenCalledTimes(1);
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(1);
    trading.observeOrder.mockResolvedValueOnce(receipt);
    await service.resumeRecovery('user-one');
    expect(trading.observeOrder).toHaveBeenCalledTimes(2);
  });
  it('blocks recovery and approval while reset clears the journal and drops an old discovery result', async () => {
    const journal = createOrderDispatchJournal(memory());
    const { service, trading } = setup(journal);
    const list = deferred<{
      operations: {
        previewId: string;
        receipt: PredictOrderReceipt;
        createdAt: string;
        submittedAt: null;
      }[];
    }>();
    const listed = deferred<void>();
    trading.listUnresolvedOrders.mockImplementationOnce(() => {
      listed.resolve();
      return list.promise;
    });
    const recovery = service.resumeRecovery('user-one');
    await listed.promise;
    const clear = deferred<void>();
    const clearing = deferred<void>();
    const originalClear = journal.clear;
    jest.spyOn(journal, 'clear').mockImplementationOnce(async () => {
      clearing.resolve();
      await clear.promise;
      await originalClear();
    });

    const reset = service.reset();
    await clearing.promise;
    await service.resumeRecovery('user-one');
    await expect(
      service.commitPreview(KALSHI_VENUE_ID, preview.previewId, signing),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    list.resolve({
      operations: [
        {
          previewId: preview.previewId,
          receipt,
          createdAt: '2026-11-12T00:00:00.000Z',
          submittedAt: null,
        },
      ],
    });
    await recovery.catch(() => undefined);
    clear.resolve();
    await reset;

    expect(trading.listUnresolvedOrders).toHaveBeenCalledTimes(1);
    expect(service.getRecovery(KALSHI_VENUE_ID)).toEqual([]);
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([]);
    expect(trading.commitOrder).not.toHaveBeenCalled();
    expect(trading.observeOrder).not.toHaveBeenCalled();
  });

  it.each(['submitted', 'needs_manual_review'] as const)(
    'does not resurrect a resolved order from a delayed discovery page reporting %s',
    async (status) => {
      const journal = createOrderDispatchJournal(memory());
      const { service, trading, resolved } = setup(journal);
      await service.resumeRecovery('user-one');
      await quote(service);
      const list = deferred<{
        operations: {
          previewId: string;
          receipt: PredictOrderReceipt;
          createdAt: string;
          submittedAt: null;
        }[];
      }>();
      const listed = deferred<void>();
      trading.listUnresolvedOrders.mockImplementationOnce(() => {
        listed.resolve();
        return list.promise;
      });
      const recovery = service.refreshRecovery(KALSHI_VENUE_ID);
      await listed.promise;
      await service.commitPreview(KALSHI_VENUE_ID, preview.previewId, signing);
      expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([]);

      list.resolve({
        operations: [
          {
            previewId: preview.previewId,
            receipt: { ...receipt, status },
            createdAt: '2026-11-12T00:00:00.000Z',
            submittedAt: null,
          },
        ],
      });
      await recovery;

      expect(service.getRecovery(KALSHI_VENUE_ID)).toEqual([]);
      expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([]);
      expect(resolved).toHaveBeenCalledTimes(1);
      expect(trading.observeOrder).not.toHaveBeenCalled();
    },
  );
  it('prunes a delayed discovery write that overlaps terminal manual review', async () => {
    const journal = createOrderDispatchJournal(memory());
    const { service, trading } = setup(journal);
    await service.resumeRecovery('user-one');
    await quote(service);
    const discovered = deferred<void>();
    const releaseDiscovery = deferred<void>();
    const put = journal.put;
    let holdDiscovery = true;
    jest.spyOn(journal, 'put').mockImplementation(async (entry) => {
      if (holdDiscovery) {
        holdDiscovery = false;
        discovered.resolve();
        await releaseDiscovery.promise;
      }
      await put(entry);
    });
    trading.listUnresolvedOrders.mockResolvedValueOnce({
      operations: [{
        previewId: preview.previewId,
        receipt: { ...receipt, status: 'submitted' },
        createdAt: '2026-11-12T00:00:00.000Z',
        submittedAt: null,
      }],
    });
    const recovery = service.refreshRecovery(KALSHI_VENUE_ID);
    await discovered.promise;
    trading.commitOrder.mockResolvedValueOnce({ ...receipt, status: 'needs_manual_review' });
    await service.commitPreview(KALSHI_VENUE_ID, preview.previewId, signing);
    releaseDiscovery.resolve();
    await recovery;
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toEqual([]);
    expect(service.getRecovery(KALSHI_VENUE_ID)).toEqual([
      { previewId: preview.previewId, status: 'needs_manual_review' },
    ]);
  });

  it('never trusts a restored manual-review marker as a terminal server outcome', async () => {
    const journal = createOrderDispatchJournal(memory());
    await journal.put({ ...reference, recoveryState: 'manual_review' });
    const { service, trading, resolved } = setup(journal);
    await service.resumeRecovery('user-one');
    expect(service.getRecovery(KALSHI_VENUE_ID)).toEqual([
      { previewId: reference.previewId, status: 'checking' },
    ]);
    expect(trading.observeOrder).toHaveBeenCalledTimes(1);
    expect(resolved).not.toHaveBeenCalled();
    expect(await journal.list('user-one', KALSHI_VENUE_ID)).toHaveLength(1);
    expect(trading.commitOrder).not.toHaveBeenCalled();
  });
});
