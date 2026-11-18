import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';

import { PredictError, PredictErrorCode } from '../errors';
import type { VenueFundingAdapter } from '../adapters/types';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictHex,
  PredictTimestamp,
  PredictVenueId,
  PredictWithdrawPreview,
  PredictWithdrawReceipt,
  PredictWithdrawReceiptStatus,
} from '../types';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import awaitingTransfer from '../contracts/v1/fixtures/funding-contract/awaiting-transfer.json';
import cancelled from '../contracts/v1/fixtures/funding-contract/cancelled.json';
import credited from '../contracts/v1/fixtures/funding-contract/credited.json';
import needsReview from '../contracts/v1/fixtures/funding-contract/needs-review.json';
import transferReported from '../contracts/v1/fixtures/funding-contract/transfer-reported.json';
import {
  PREDICT_FUNDING_SERVICE_NAME,
  PredictFundingService,
  type PredictFundingServiceActions,
  type PredictFundingServiceEvents,
  type PredictFundingServiceMessenger,
} from './PredictFundingService';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const venueId = 'kalshi' as PredictVenueId;
const APPROVAL = { kind: 'user-approved' as const };
const PARAMS = {
  amount: '25.50' as PredictAmount,
  clientOperationId: '6f1c7a52-8f3e-4d8b-9c1e-2a4b5c6d7e8f',
};
const OPERATION_ID = awaitingTransfer.operationId;
const deposit = (fixture: unknown): PredictDepositOperation =>
  fixture as PredictDepositOperation;

const preview: PredictWithdrawPreview = {
  previewId: 'preview-1',
  venueId: KALSHI_VENUE_ID,
  currency: 'USD',
  mode: 'fixed',
  requestedAmount: '5.00' as PredictAmount,
  destination: {
    address: '0xcDe7aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa9B9c',
    network: 'base',
    source: 'configured_demo',
  },
  expiresAt: '2099-03-01T12:01:00.000Z' as PredictTimestamp,
};

const receipt = (
  status: PredictWithdrawReceiptStatus,
  overrides: Partial<PredictWithdrawReceipt> = {},
): PredictWithdrawReceipt => ({
  operationId: 'operation-1',
  previewId: 'preview-1',
  venueId: KALSHI_VENUE_ID,
  currency: 'USD',
  mode: 'fixed',
  status,
  needsManualReview: false,
  requestedAmount: '5.00' as PredictAmount,
  withdrawnAmount: status === 'settled' ? ('5.00' as PredictAmount) : null,
  venueTransferId: null,
  destination: preview.destination,
  createdAt: '2026-03-01T12:00:00.000Z' as PredictTimestamp,
  resolvedAt: null,
  ...overrides,
});

// The mobile TypeScript library target is ES2022, before
// Promise.withResolvers; keep the test barrier explicit.
const deferred = <Value>() => {
  let resolve!: (value: Value) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const previewWithdraw: jest.MockedFunction<
  VenueFundingAdapter['previewWithdraw']
> = jest.fn();
const commitWithdraw: jest.MockedFunction<
  VenueFundingAdapter['commitWithdraw']
> = jest.fn();
const observeWithdraw: jest.MockedFunction<
  VenueFundingAdapter['observeWithdraw']
> = jest.fn();
const invalidateQueries = jest.fn<Promise<void>, [unknown]>();

const createFunding = (): jest.Mocked<VenueFundingAdapter> => ({
  prepareDeposit: jest.fn().mockResolvedValue(deposit(awaitingTransfer)),
  getDeposit: jest.fn(),
  listOpenDeposits: jest.fn(),
  reportDepositTransfer: jest.fn(),
  cancelDeposit: jest.fn(),
  previewWithdraw,
  commitWithdraw,
  observeWithdraw,
});

const createMessenger = () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const messenger = {
    registerActionHandler: jest.fn(
      (type: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(type, handler);
      },
    ),
    unregisterActionHandler: jest.fn((type: string) => handlers.delete(type)),
    publish: jest.fn(),
    call: jest.fn().mockResolvedValue(undefined),
  };
  return {
    messenger: messenger as unknown as PredictFundingServiceMessenger,
    mock: messenger,
    handlers,
  };
};

const services: PredictFundingService[] = [];

const serviceWith = (): PredictFundingService => {
  const rootMessenger = new Messenger<
    MockAnyNamespace,
    PredictFundingServiceActions,
    PredictFundingServiceEvents
  >({ namespace: MOCK_ANY_NAMESPACE });
  rootMessenger.registerActionHandler(
    'PredictPortfolioService:invalidateQueries',
    invalidateQueries,
  );
  const messenger: PredictFundingServiceMessenger = new Messenger({
    namespace: PREDICT_FUNDING_SERVICE_NAME,
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['PredictPortfolioService:invalidateQueries'],
    events: [],
    messenger,
  });
  const service = new PredictFundingService({
    messenger,
    funding: createFunding(),
    venueId: KALSHI_VENUE_ID,
  });
  services.push(service);
  return service;
};

const invalidations = () =>
  portfolioQueryFamilies(KALSHI_VENUE_ID).map((queryKey) => [{ queryKey }]);

beforeEach(() => {
  previewWithdraw.mockReset().mockResolvedValue(preview);
  commitWithdraw.mockReset().mockResolvedValue(receipt('processing'));
  observeWithdraw.mockReset().mockResolvedValue(receipt('processing'));
  invalidateQueries.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  services.splice(0).forEach((service) => service.destroy());
});

describe('PredictFundingService withdrawal flow', () => {
  describe('requestWithdrawPreview', () => {
    it('quotes a fixed amount without caching or transforming it', async () => {
      const service = serviceWith();
      const params = { amount: '5.00' as PredictAmount };

      const quoted = await service.requestWithdrawPreview(
        KALSHI_VENUE_ID,
        params,
      );

      expect(quoted).toBe(preview);
      expect(previewWithdraw).toHaveBeenCalledWith(params, undefined);
    });

    it('quotes a sweep with the whole-balance intent', async () => {
      const service = serviceWith();
      const sweep = { ...preview, mode: 'sweep_all' as const };
      previewWithdraw.mockResolvedValueOnce(sweep);

      const quoted = await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        sweepAll: true,
      });

      expect(quoted).toBe(sweep);
      expect(previewWithdraw).toHaveBeenCalledWith(
        { sweepAll: true },
        undefined,
      );
    });

    it('discards a quote that lands after the Predict User was replaced', async () => {
      const service = serviceWith();
      const gate = deferred<PredictWithdrawPreview>();
      previewWithdraw.mockReturnValueOnce(gate.promise);

      const pending = service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        sweepAll: true,
      });
      service.abandon();
      gate.resolve(preview);

      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
    });

    it('reports a quote failure that lands after abandonment as unauthenticated', async () => {
      const service = serviceWith();
      const gate = deferred<PredictWithdrawPreview>();
      previewWithdraw.mockReturnValueOnce(gate.promise);

      const pending = service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        sweepAll: true,
      });
      service.abandon();
      gate.reject(PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE));

      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
    });
  });

  describe('commitWithdrawPreview', () => {
    it('commits by reference and returns the canonical receipt', async () => {
      const service = serviceWith();
      const canonical = receipt('processing');
      commitWithdraw.mockResolvedValueOnce(canonical);

      const result = await service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(result).toBe(canonical);
      expect(commitWithdraw.mock.calls).toEqual([
        ['preview-1', { signal: expect.any(AbortSignal) }],
      ]);
    });

    it('forwards caller cancellation and keeps its AbortError', async () => {
      const service = serviceWith();
      const caller = new AbortController();
      const gate = deferred<PredictWithdrawReceipt>();
      let signal: AbortSignal | undefined;
      commitWithdraw.mockImplementationOnce((_previewId, options) => {
        signal = options?.signal;
        return gate.promise;
      });

      const pending = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        { signal: caller.signal },
      );
      expect(signal).not.toBe(caller.signal);
      expect(signal?.aborted).toBe(false);

      caller.abort();
      expect(signal?.aborted).toBe(true);
      const abortError = new Error('The request was aborted.');
      abortError.name = 'AbortError';
      gate.reject(abortError);

      await expect(pending).rejects.toBe(abortError);
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('aborts a commit still resolving its token when abandoned', async () => {
      const service = serviceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      let signal: AbortSignal | undefined;
      commitWithdraw.mockImplementationOnce((_previewId, options) => {
        signal = options?.signal;
        return gate.promise;
      });

      const pending = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );
      expect(signal?.aborted).toBe(false);

      service.abandon();
      expect(signal?.aborted).toBe(true);
      gate.resolve(receipt('processing'));

      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('aborts a commit still resolving its token when destroyed', async () => {
      const service = serviceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      let signal: AbortSignal | undefined;
      commitWithdraw.mockImplementationOnce((_previewId, options) => {
        signal = options?.signal;
        return gate.promise;
      });

      const pending = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );
      expect(signal?.aborted).toBe(false);

      service.destroy();
      expect(signal?.aborted).toBe(true);
      gate.resolve(receipt('processing'));

      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('removes the caller abort listener after a normal commit', async () => {
      const service = serviceWith();
      const addEventListener = jest.fn();
      const removeEventListener = jest.fn();
      const caller = {
        aborted: false,
        addEventListener,
        removeEventListener,
      } as unknown as AbortSignal;

      const result = await service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        { signal: caller },
      );

      expect(result.status).toBe('processing');
      expect(addEventListener).toHaveBeenCalledWith(
        'abort',
        expect.any(Function),
      );
      expect(removeEventListener).toHaveBeenCalledWith(
        'abort',
        addEventListener.mock.calls[0][1],
      );
    });

    it('returns the persisted refusal as an outcome rather than throwing', async () => {
      const service = serviceWith();
      const refusal = receipt('rejected', {
        rejectionCode: 'insufficient_balance',
      });
      commitWithdraw.mockResolvedValueOnce(refusal);
      observeWithdraw.mockResolvedValueOnce(refusal);

      const committed = await service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );
      const observed = await service.observeWithdraw(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(committed).toBe(refusal);
      expect(observed).toBe(refusal);
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('observeWithdraw', () => {
    it('reads the receipt without submitting', async () => {
      const service = serviceWith();
      const canonical = receipt('settled');
      observeWithdraw.mockResolvedValueOnce(canonical);

      const result = await service.observeWithdraw(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(result).toBe(canonical);
      expect(observeWithdraw.mock.calls).toEqual([['preview-1', undefined]]);
      expect(commitWithdraw).not.toHaveBeenCalled();
    });

    it('reports a read failure that lands after abandonment as unauthenticated', async () => {
      const service = serviceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      observeWithdraw.mockReturnValueOnce(gate.promise);

      const pending = service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');
      service.abandon();
      gate.reject(PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE));

      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe.each(['preview', 'commit', 'observe'] as const)(
    '%s contract',
    (method) => {
      const invoke = (
        service: PredictFundingService,
        targetVenueId = KALSHI_VENUE_ID,
      ) => {
        if (method === 'preview') {
          return service.requestWithdrawPreview(targetVenueId, {
            sweepAll: true,
          });
        }
        return method === 'commit'
          ? service.commitWithdrawPreview(targetVenueId, 'preview-1')
          : service.observeWithdraw(targetVenueId, 'preview-1');
      };

      it('refuses a Venue this service does not serve', async () => {
        const service = serviceWith();

        const result = invoke(service, 'other-venue' as PredictVenueId);

        await expect(result).rejects.toMatchObject({
          code: PredictErrorCode.UNSUPPORTED_VENUE,
        });
        expect(previewWithdraw).not.toHaveBeenCalled();
        expect(commitWithdraw).not.toHaveBeenCalled();
        expect(observeWithdraw).not.toHaveBeenCalled();
      });

      it('surfaces the backend error unchanged', async () => {
        const service = serviceWith();
        const failure = PredictError.from(
          PredictErrorCode.AMOUNT_BELOW_MINIMUM,
        );
        previewWithdraw.mockRejectedValueOnce(failure);
        commitWithdraw.mockRejectedValueOnce(failure);
        observeWithdraw.mockRejectedValueOnce(failure);

        const result = invoke(service);

        await expect(result).rejects.toBe(failure);
        expect(invalidateQueries).not.toHaveBeenCalled();
      });
    },
  );

  describe('portfolio invalidation', () => {
    it('invalidates every portfolio read once per status transition', async () => {
      const service = serviceWith();
      observeWithdraw
        .mockResolvedValueOnce(receipt('processing'))
        .mockResolvedValueOnce(receipt('settled'))
        .mockResolvedValueOnce(receipt('settled'));

      await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      expect(invalidateQueries.mock.calls).toEqual(invalidations());
      await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');
      expect(invalidateQueries.mock.calls).toEqual(invalidations());
      await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');
      await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');

      expect(invalidateQueries.mock.calls).toEqual([
        ...invalidations(),
        ...invalidations(),
      ]);
    });

    it.each(['settled', 'failed', 'returned'] as const)(
      'invalidates all portfolio reads for %s',
      async (status) => {
        const service = serviceWith();
        observeWithdraw.mockResolvedValueOnce(receipt(status));

        await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');

        expect(invalidateQueries.mock.calls).toEqual(invalidations());
      },
    );

    it.each(['pending', 'rejected'] as const)(
      'does not invalidate for %s receipts',
      async (status) => {
        const service = serviceWith();
        commitWithdraw.mockResolvedValueOnce(receipt(status));
        observeWithdraw.mockResolvedValueOnce(receipt(status));

        await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
        await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');

        expect(invalidateQueries).not.toHaveBeenCalled();
      },
    );

    it('tracks status separately for each preview', async () => {
      const service = serviceWith();
      observeWithdraw.mockResolvedValueOnce(
        receipt('processing', { previewId: 'preview-2' }),
      );

      await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-2');

      expect(invalidateQueries.mock.calls).toEqual([
        ...invalidations(),
        ...invalidations(),
      ]);
    });

    it.each(['commit', 'observe'] as const)(
      'keeps %s successful when invalidation fails',
      async (method) => {
        const service = serviceWith();
        invalidateQueries.mockRejectedValue(new Error('invalidate failed'));

        const result =
          method === 'commit'
            ? await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1')
            : await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');

        expect(result.status).toBe('processing');
        expect(invalidateQueries.mock.calls).toEqual(invalidations());
      },
    );
  });

  describe('abandon', () => {
    it('forgets receipt statuses so the next processing receipt invalidates again', async () => {
      const service = serviceWith();
      await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      invalidateQueries.mockClear();

      service.abandon();
      await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');

      expect(invalidateQueries.mock.calls).toEqual(invalidations());
    });

    it.each(['commit', 'observe'] as const)(
      'discards an in-flight %s after the Predict User changes',
      async (method) => {
        const service = serviceWith();
        const gate = deferred<PredictWithdrawReceipt>();
        commitWithdraw.mockReturnValueOnce(gate.promise);
        observeWithdraw.mockReturnValueOnce(gate.promise);

        const pending =
          method === 'commit'
            ? service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1')
            : service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');
        service.abandon();
        gate.resolve(receipt('settled'));

        await expect(pending).rejects.toMatchObject({
          code: PredictErrorCode.UNAUTHENTICATED,
        });
        expect(invalidateQueries).not.toHaveBeenCalled();
      },
    );
  });

  describe('lifecycle', () => {
    it('runs registered cleanup exactly once and abandons in-flight receipts', async () => {
      const service = serviceWith();
      const cleanup = jest.fn();
      const gate = deferred<PredictWithdrawReceipt>();
      observeWithdraw.mockReturnValueOnce(gate.promise);
      service.setLifecycleCleanup(cleanup);
      const pending = service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');

      service.destroy();
      service.destroy();
      gate.resolve(receipt('settled'));

      expect(cleanup).toHaveBeenCalledTimes(1);
      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });
});

describe('PredictFundingService deposit flow', () => {
  let funding: jest.Mocked<VenueFundingAdapter>;
  let messenger: ReturnType<typeof createMessenger>;
  let service: PredictFundingService;

  beforeEach(() => {
    funding = createFunding();
    messenger = createMessenger();
    service = new PredictFundingService({
      messenger: messenger.messenger,
      funding,
      venueId,
    });
  });

  it('registers the deposit actions', () => {
    expect([...messenger.handlers.keys()]).toEqual([
      'PredictFundingService:prepareDeposit',
      'PredictFundingService:getDeposit',
      'PredictFundingService:listOpenDeposits',
      'PredictFundingService:reportDepositTransfer',
      'PredictFundingService:cancelDeposit',
    ]);
  });

  describe('prepareDeposit', () => {
    it('prepares the deposit with the explicit approval', async () => {
      await expect(
        service.prepareDeposit(venueId, PARAMS, APPROVAL),
      ).resolves.toStrictEqual(awaitingTransfer);

      expect(funding.prepareDeposit).toHaveBeenCalledWith(PARAMS, APPROVAL);
    });

    it('sends nothing without the approval', async () => {
      await expect(
        service.prepareDeposit(venueId, PARAMS),
      ).rejects.toMatchObject({
        code: PredictErrorCode.VENUE_SIGNING_REFUSED,
        metadata: { mutationRelay: 'not_relayed_this_invocation' },
      });
      expect(funding.prepareDeposit).not.toHaveBeenCalled();
    });

    it('shares one call per clientOperationId while it is in flight', async () => {
      const gate = deferred<PredictDepositOperation>();
      funding.prepareDeposit.mockReturnValue(gate.promise);

      const first = service.prepareDeposit(venueId, PARAMS, APPROVAL);
      const second = service.prepareDeposit(venueId, PARAMS, APPROVAL);
      gate.resolve(deposit(awaitingTransfer));

      expect(second).toBe(first);
      await expect(first).resolves.toStrictEqual(awaitingTransfer);
      expect(funding.prepareDeposit).toHaveBeenCalledTimes(1);
    });

    it('runs again after the call in flight settles', async () => {
      funding.prepareDeposit.mockRejectedValueOnce(
        PredictError.from(PredictErrorCode.NETWORK_ERROR),
      );

      await expect(
        service.prepareDeposit(venueId, PARAMS, APPROVAL),
      ).rejects.toMatchObject({ code: PredictErrorCode.NETWORK_ERROR });
      await expect(
        service.prepareDeposit(venueId, PARAMS, APPROVAL),
      ).resolves.toStrictEqual(awaitingTransfer);
      expect(funding.prepareDeposit).toHaveBeenCalledTimes(2);
    });

    it('refuses another Venue', async () => {
      await expect(
        service.prepareDeposit(
          'polymarket' as PredictVenueId,
          PARAMS,
          APPROVAL,
        ),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNSUPPORTED_VENUE });
      expect(funding.prepareDeposit).not.toHaveBeenCalled();
    });
  });

  it('passes the deposit reads and writes through to the adapter', async () => {
    const transfer = {
      txHash: transferReported.txHash as PredictHex,
      chainId: 84532,
    };
    funding.getDeposit.mockResolvedValue(deposit(awaitingTransfer));
    funding.listOpenDeposits.mockResolvedValue([deposit(awaitingTransfer)]);
    funding.reportDepositTransfer.mockResolvedValue(deposit(transferReported));
    funding.cancelDeposit.mockResolvedValue(deposit(cancelled));

    await expect(service.getDeposit(venueId, OPERATION_ID)).resolves.toBe(
      awaitingTransfer,
    );
    await expect(service.listOpenDeposits(venueId)).resolves.toStrictEqual([
      awaitingTransfer,
    ]);
    await expect(
      service.reportDepositTransfer(venueId, OPERATION_ID, transfer),
    ).resolves.toBe(transferReported);
    await expect(service.cancelDeposit(venueId, OPERATION_ID)).resolves.toBe(
      cancelled,
    );

    expect(funding.getDeposit).toHaveBeenCalledWith(OPERATION_ID);
    expect(funding.reportDepositTransfer).toHaveBeenCalledWith(
      OPERATION_ID,
      transfer,
    );
    expect(funding.cancelDeposit).toHaveBeenCalledWith(OPERATION_ID);
  });

  it.each([
    [
      'getDeposit',
      () => service.getDeposit('polymarket' as PredictVenueId, OPERATION_ID),
    ],
    [
      'listOpenDeposits',
      () => service.listOpenDeposits('polymarket' as PredictVenueId),
    ],
    [
      'cancelDeposit',
      () => service.cancelDeposit('polymarket' as PredictVenueId, OPERATION_ID),
    ],
  ])('%s refuses another Venue', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({
      code: PredictErrorCode.UNSUPPORTED_VENUE,
    });
  });

  describe('depositResolved', () => {
    const resolvedEvents = () =>
      messenger.mock.publish.mock.calls.filter(
        ([type]) => type === 'PredictFundingService:depositResolved',
      );

    it('is published once when a watched deposit completes', async () => {
      await service.prepareDeposit(venueId, PARAMS, APPROVAL);
      funding.getDeposit.mockResolvedValue(deposit(transferReported));
      await service.getDeposit(venueId, OPERATION_ID);
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await service.getDeposit(venueId, OPERATION_ID);
      await service.getDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents()).toEqual([
        [
          'PredictFundingService:depositResolved',
          { venueId, deposit: credited },
        ],
      ]);
    });

    it('refreshes the Balance and Summary when a deposit completes', async () => {
      await service.prepareDeposit(venueId, PARAMS, APPROVAL);
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await service.getDeposit(venueId, OPERATION_ID);

      expect(messenger.mock.call).toHaveBeenCalledWith(
        'PredictPortfolioService:invalidateQueries',
        { queryKey: ['PredictPortfolioService:getBalance', venueId] },
      );
      expect(messenger.mock.call).toHaveBeenCalledWith(
        'PredictPortfolioService:invalidateQueries',
        { queryKey: ['PredictPortfolioService:getPortfolioSummary', venueId] },
      );
    });

    it('does not fail the read when the refresh fails', async () => {
      messenger.mock.call.mockRejectedValue(new Error('no portfolio'));
      await service.prepareDeposit(venueId, PARAMS, APPROVAL);
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await expect(service.getDeposit(venueId, OPERATION_ID)).resolves.toBe(
        credited,
      );
    });

    it('is published when the user cancels a waiting deposit', async () => {
      funding.listOpenDeposits.mockResolvedValue([deposit(awaitingTransfer)]);
      funding.cancelDeposit.mockResolvedValue(deposit(cancelled));
      await service.listOpenDeposits(venueId);

      await service.cancelDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents()).toHaveLength(1);
      expect(messenger.mock.call).not.toHaveBeenCalled();
    });

    it('is published again when a cancelled deposit goes under review', async () => {
      funding.cancelDeposit.mockResolvedValue(deposit(cancelled));
      await service.prepareDeposit(venueId, PARAMS, APPROVAL);
      await service.cancelDeposit(venueId, OPERATION_ID);
      funding.getDeposit.mockResolvedValue(deposit(needsReview));

      await service.getDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents().map(([, { deposit: d }]) => d.status)).toEqual([
        'cancelled',
        'under_review',
      ]);
    });

    describe('when support resolves a deposit again', () => {
      const BALANCE_KEY = ['PredictPortfolioService:getBalance', venueId];
      const SUMMARY_KEY = [
        'PredictPortfolioService:getPortfolioSummary',
        venueId,
      ];
      const closedByReview = deposit({
        ...needsReview,
        status: 'failed',
        next: null,
      });
      const invalidatedKeys = (): unknown[] =>
        messenger.mock.call.mock.calls.map(([, { queryKey }]) => queryKey);

      const watch = async (
        ...statuses: PredictDepositOperation[]
      ): Promise<void> => {
        await service.prepareDeposit(venueId, PARAMS, APPROVAL);
        for (const status of statuses) {
          funding.getDeposit.mockResolvedValueOnce(status);
          await service.getDeposit(venueId, OPERATION_ID);
        }
        messenger.mock.publish.mockClear();
        messenger.mock.call.mockClear();
      };

      it('announces a credit after review and refreshes the Balance and Summary', async () => {
        await watch(deposit(transferReported), deposit(needsReview));
        funding.getDeposit.mockResolvedValue(deposit(credited));

        await service.getDeposit(venueId, OPERATION_ID);

        expect(resolvedEvents()).toEqual([
          [
            'PredictFundingService:depositResolved',
            { venueId, deposit: credited },
          ],
        ]);
        expect(invalidatedKeys()).toEqual([BALANCE_KEY, SUMMARY_KEY]);
      });

      it('announces a review closed without a credit', async () => {
        await watch(deposit(needsReview));
        funding.getDeposit.mockResolvedValue(closedByReview);

        await service.getDeposit(venueId, OPERATION_ID);

        expect(resolvedEvents()).toEqual([
          [
            'PredictFundingService:depositResolved',
            { venueId, deposit: closedByReview },
          ],
        ]);
        expect(messenger.mock.call).not.toHaveBeenCalled();
      });

      it('announces a credit going back to review and refreshes the Balance and Summary', async () => {
        await watch(deposit(credited));
        funding.getDeposit.mockResolvedValue(deposit(needsReview));

        await service.getDeposit(venueId, OPERATION_ID);

        expect(resolvedEvents()).toEqual([
          [
            'PredictFundingService:depositResolved',
            { venueId, deposit: needsReview },
          ],
        ]);
        expect(invalidatedKeys()).toEqual([BALANCE_KEY, SUMMARY_KEY]);
      });

      it('announces a late transfer after a cancel once it is credited', async () => {
        await watch(deposit(cancelled), deposit(transferReported));
        funding.getDeposit.mockResolvedValue(deposit(credited));

        await service.getDeposit(venueId, OPERATION_ID);
        await service.getDeposit(venueId, OPERATION_ID);

        expect(resolvedEvents()).toHaveLength(1);
        expect(invalidatedKeys()).toEqual([BALANCE_KEY, SUMMARY_KEY]);
      });
    });

    describe('when an older read arrives late', () => {
      const TRANSFER = {
        txHash: transferReported.txHash as PredictHex,
        chainId: 84532,
      };
      const statuses = (): string[] =>
        resolvedEvents().map(([, { deposit: d }]) => d.status);

      it('does not announce a completion twice', async () => {
        await service.prepareDeposit(venueId, PARAMS, APPROVAL);
        const olderDetail = deferred<PredictDepositOperation>();
        const olderList = deferred<PredictDepositOperation[]>();
        funding.getDeposit.mockReturnValueOnce(olderDetail.promise);
        funding.listOpenDeposits.mockReturnValueOnce(olderList.promise);
        const detail = service.getDeposit(venueId, OPERATION_ID);
        const list = service.listOpenDeposits(venueId);
        funding.reportDepositTransfer.mockResolvedValue(deposit(credited));
        await service.reportDepositTransfer(venueId, OPERATION_ID, TRANSFER);

        olderDetail.resolve(deposit(awaitingTransfer));
        olderList.resolve([deposit(transferReported)]);
        await Promise.all([detail, list]);
        funding.getDeposit.mockResolvedValue(deposit(credited));
        await service.getDeposit(venueId, OPERATION_ID);

        expect(statuses()).toEqual(['completed']);
        expect(messenger.mock.call).toHaveBeenCalledTimes(2);
      });

      it('still answers the caller with what the backend sent', async () => {
        await service.prepareDeposit(venueId, PARAMS, APPROVAL);
        const older = deferred<PredictDepositOperation>();
        funding.getDeposit.mockReturnValueOnce(older.promise);
        const detail = service.getDeposit(venueId, OPERATION_ID);
        funding.reportDepositTransfer.mockResolvedValue(deposit(credited));
        await service.reportDepositTransfer(venueId, OPERATION_ID, TRANSFER);

        older.resolve(deposit(awaitingTransfer));

        await expect(detail).resolves.toBe(awaitingTransfer);
      });

      it('does not take a review from before a credit for a new review', async () => {
        await service.prepareDeposit(venueId, PARAMS, APPROVAL);
        funding.getDeposit.mockResolvedValueOnce(deposit(needsReview));
        await service.getDeposit(venueId, OPERATION_ID);
        const older = deferred<PredictDepositOperation>();
        funding.getDeposit.mockReturnValueOnce(older.promise);
        const olderRead = service.getDeposit(venueId, OPERATION_ID);
        funding.getDeposit.mockResolvedValueOnce(deposit(credited));
        await service.getDeposit(venueId, OPERATION_ID);

        older.resolve(deposit(needsReview));
        await olderRead;
        funding.getDeposit.mockResolvedValue(deposit(credited));
        await service.getDeposit(venueId, OPERATION_ID);

        expect(statuses()).toEqual(['under_review', 'completed']);
        expect(messenger.mock.call).toHaveBeenCalledTimes(2);
      });

      it('takes a review that a read sent after the credit reports', async () => {
        await service.prepareDeposit(venueId, PARAMS, APPROVAL);
        funding.reportDepositTransfer.mockResolvedValue(deposit(credited));
        await service.reportDepositTransfer(venueId, OPERATION_ID, TRANSFER);
        funding.getDeposit.mockResolvedValue(deposit(needsReview));

        await service.getDeposit(venueId, OPERATION_ID);

        expect(statuses()).toEqual(['completed', 'under_review']);
      });

      it('takes a later stage from a read that overlapped another', async () => {
        await service.prepareDeposit(venueId, PARAMS, APPROVAL);
        const cancelling = deferred<PredictDepositOperation>();
        funding.cancelDeposit.mockReturnValueOnce(cancelling.promise);
        const cancel = service.cancelDeposit(venueId, OPERATION_ID);
        funding.listOpenDeposits.mockResolvedValue([deposit(awaitingTransfer)]);
        await service.listOpenDeposits(venueId);

        cancelling.resolve(deposit(cancelled));
        await cancel;

        expect(statuses()).toEqual(['cancelled']);
      });
    });

    it('is not published for a deposit first read already resolved', async () => {
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await service.getDeposit(venueId, OPERATION_ID);
      await service.getDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents()).toEqual([]);
    });

    it('forgets every deposit on clearState', async () => {
      await service.prepareDeposit(venueId, PARAMS, APPROVAL);
      service.clearState();
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await service.getDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents()).toEqual([]);
    });

    it('does not record an answer that arrives after clearState', async () => {
      const gate = deferred<PredictDepositOperation>();
      funding.prepareDeposit.mockReturnValue(gate.promise);
      const prepared = service.prepareDeposit(venueId, PARAMS, APPROVAL);
      service.clearState();
      gate.resolve(deposit(awaitingTransfer));
      await prepared;
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await service.getDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents()).toEqual([]);
    });

    it('does not share a call in flight across clearState', async () => {
      funding.prepareDeposit.mockReturnValue(new Promise(() => undefined));
      const before = service.prepareDeposit(venueId, PARAMS, APPROVAL);
      service.clearState();

      const after = service.prepareDeposit(venueId, PARAMS, APPROVAL);

      expect(after).not.toBe(before);
      expect(funding.prepareDeposit).toHaveBeenCalledTimes(2);
    });
  });

  it('unregisters its actions on destroy', () => {
    service.destroy();

    expect(messenger.handlers.size).toBe(0);
  });
});
