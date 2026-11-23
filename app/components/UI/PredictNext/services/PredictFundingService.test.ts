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

const quotedServiceWith = async (): Promise<PredictFundingService> => {
  const service = serviceWith();
  await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
    amount: preview.requestedAmount as PredictAmount,
  });
  return service;
};

const invalidations = () =>
  portfolioQueryFamilies(KALSHI_VENUE_ID).map((queryKey) => [{ queryKey }]);

beforeEach(() => {
  previewWithdraw.mockReset().mockResolvedValue(preview);
  commitWithdraw
    .mockReset()
    .mockImplementation((_previewId, _options, onDispatch) => {
      onDispatch?.();
      return Promise.resolve(receipt('processing'));
    });
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
      service.changeIdentity();
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
      service.changeIdentity();
      gate.reject(PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE));

      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
    });

    it('keeps only the newest 50 unused quotes', async () => {
      const service = serviceWith();
      for (let index = 0; index < 100; index += 1) {
        previewWithdraw.mockResolvedValueOnce({
          ...preview,
          previewId: `quote-${index}`,
        });
        await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
          sweepAll: true,
        });
      }
      for (let index = 0; index < 50; index += 1) {
        await expect(
          service.commitWithdrawPreview(KALSHI_VENUE_ID, `quote-${index}`),
        ).rejects.toMatchObject({ code: PredictErrorCode.UNAUTHENTICATED });
      }
      expect(commitWithdraw).not.toHaveBeenCalled();
      commitWithdraw.mockImplementation((previewId, _options, onDispatch) => {
        onDispatch?.();
        return Promise.resolve(receipt('processing', { previewId }));
      });
      for (let index = 50; index < 100; index += 1) {
        await expect(
          service.commitWithdrawPreview(KALSHI_VENUE_ID, `quote-${index}`),
        ).resolves.toMatchObject({ previewId: `quote-${index}` });
      }
    });

    it('retains an in-flight dispatched preview through a long quote sequence', async () => {
      const service = await quotedServiceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      commitWithdraw.mockImplementationOnce(
        (_previewId, _options, onDispatch) => {
          onDispatch?.();
          return gate.promise;
        },
      );
      const pending = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );
      await Promise.resolve();
      for (let index = 0; index < 100; index += 1) {
        previewWithdraw.mockResolvedValueOnce({
          ...preview,
          previewId: `quote-${index}`,
        });
        await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
          sweepAll: true,
        });
      }
      expect(service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1')).toBe(
        pending,
      );
      gate.resolve(receipt('processing'));
      await expect(pending).resolves.toMatchObject({ status: 'processing' });
      observeWithdraw.mockResolvedValueOnce(
        receipt('settled', {
          requestedAmount: '6' as PredictAmount,
        }),
      );
      await expect(
        service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1'),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
      expect(commitWithdraw).toHaveBeenCalledTimes(1);
    });

    it('evicts settled pins while keeping the latest quote usable', async () => {
      const service = serviceWith();
      commitWithdraw.mockImplementation((previewId, _options, onDispatch) => {
        onDispatch?.();
        return Promise.resolve(receipt('settled', { previewId }));
      });
      for (let index = 0; index < 60; index += 1) {
        const previewId = `settled-${index}`;
        previewWithdraw.mockResolvedValueOnce({ ...preview, previewId });
        await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
          sweepAll: true,
        });
        await service.commitWithdrawPreview(KALSHI_VENUE_ID, previewId);
      }
      const calls = commitWithdraw.mock.calls.length;

      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'settled-0'),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNAUTHENTICATED });
      expect(commitWithdraw).toHaveBeenCalledTimes(calls);
      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'settled-59'),
      ).resolves.toMatchObject({ status: 'settled' });
    });
  });

  describe('commitWithdrawPreview', () => {
    it('commits by reference and returns the canonical receipt', async () => {
      const service = await quotedServiceWith();
      const canonical = receipt('processing');
      commitWithdraw.mockResolvedValueOnce(canonical);

      const result = await service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(result).toBe(canonical);
      expect(commitWithdraw.mock.calls).toEqual([
        [
          'preview-1',
          { signal: expect.any(AbortSignal) },
          expect.any(Function),
        ],
      ]);
    });

    it('coalesces concurrent callers into one receipt and adapter commit', async () => {
      const service = await quotedServiceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      const canonical = receipt('processing');
      commitWithdraw.mockReturnValueOnce(gate.promise);

      const first = service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      const second = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(second).toBe(first);
      await Promise.resolve();
      expect(commitWithdraw).toHaveBeenCalledTimes(1);
      gate.resolve(canonical);
      await expect(first).resolves.toBe(canonical);
      await expect(second).resolves.toBe(canonical);
    });

    it('keeps a dispatched shared commit and receipt alive during lock', async () => {
      const service = await quotedServiceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      commitWithdraw.mockImplementationOnce(
        (_previewId, _options, onDispatch) => {
          onDispatch?.();
          return gate.promise;
        },
      );
      const first = service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      await Promise.resolve();

      service.stopObserving();

      expect(commitWithdraw.mock.calls[0][1]?.signal?.aborted).toBe(false);
      expect(service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1')).toBe(
        first,
      );
      gate.resolve(receipt('processing'));
      await expect(first).resolves.toMatchObject({ status: 'processing' });
      invalidateQueries.mockClear();
      await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('starts a fresh commit after lock aborts an undelivered one', async () => {
      const service = await quotedServiceWith();
      commitWithdraw.mockImplementationOnce(
        (_previewId, options) =>
          new Promise<PredictWithdrawReceipt>((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => {
              reject(
                Object.assign(new Error('The request was aborted.'), {
                  name: 'AbortError',
                }),
              );
            });
          }),
      );
      const first = service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      await Promise.resolve();

      service.stopObserving();
      // Captured, not awaited: only the request below makes it reject. The
      // autofix for `jest/valid-expect` would await it here and deadlock.
      // eslint-disable-next-line jest/valid-expect -- awaited below
      const firstRejection = expect(first).rejects.toMatchObject({
        name: 'AbortError',
      });

      // The person confirms again while the aborted promise is still pending,
      // which is where the lock window used to hand them that rejection.
      commitWithdraw.mockResolvedValueOnce(receipt('processing'));
      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toMatchObject({ status: 'processing' });
      await firstRejection;
      expect(commitWithdraw).toHaveBeenCalledTimes(2);
    });

    it('keeps a dispatched transport alive but drops its result on identity change', async () => {
      const service = await quotedServiceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      commitWithdraw.mockImplementationOnce(
        (_previewId, _options, onDispatch) => {
          onDispatch?.();
          return gate.promise;
        },
      );
      const pending = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );
      await Promise.resolve();

      service.changeIdentity();

      expect(commitWithdraw.mock.calls[0][1]?.signal?.aborted).toBe(false);
      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNAUTHENTICATED });
      expect(commitWithdraw).toHaveBeenCalledTimes(1);
      gate.resolve(receipt('processing'));
      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('marks dispatch only when notified, before the response resolves', async () => {
      const service = await quotedServiceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      let dispatch: (() => void) | undefined;
      commitWithdraw.mockImplementationOnce(
        (_previewId, _options, onDispatch) => {
          dispatch = onDispatch;
          return gate.promise;
        },
      );
      const pending = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );
      await Promise.resolve();
      expect(dispatch).toEqual(expect.any(Function));
      dispatch?.();
      service.stopObserving();
      expect(commitWithdraw.mock.calls[0][1]?.signal?.aborted).toBe(false);
      gate.resolve(receipt('processing'));
      await expect(pending).resolves.toMatchObject({ status: 'processing' });
    });

    it('does not mark an unsent failure dispatched or bypass first-dispatch expiry', async () => {
      const service = await quotedServiceWith();
      const failure = PredictError.from(PredictErrorCode.VENUE_SIGNING_REFUSED);
      commitWithdraw.mockRejectedValueOnce(failure);
      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).rejects.toBe(failure);
      const originalNow = Date.now();
      jest.mocked(Date.now).mockReturnValue(Date.parse(preview.expiresAt) + 1);
      try {
        await expect(
          service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
        ).rejects.toMatchObject({ code: PredictErrorCode.PREVIEW_EXPIRED });
        expect(commitWithdraw).toHaveBeenCalledTimes(1);
      } finally {
        jest.mocked(Date.now).mockReturnValue(originalNow);
      }
    });

    it('does not cancel the shared POST when a second caller aborts', async () => {
      const service = await quotedServiceWith();
      const caller = new AbortController();
      const gate = deferred<PredictWithdrawReceipt>();
      const canonical = receipt('processing');
      commitWithdraw.mockReturnValueOnce(gate.promise);

      const first = service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      const second = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
        {
          signal: caller.signal,
        },
      );
      // Captured, not awaited: `caller.abort()` below is what rejects it.
      // eslint-disable-next-line jest/valid-expect -- awaited below
      const cancelled = expect(second).rejects.toMatchObject({
        name: 'AbortError',
      });
      await Promise.resolve();
      caller.abort();

      await cancelled;
      expect(commitWithdraw).toHaveBeenCalledTimes(1);
      expect(commitWithdraw.mock.calls[0][1]?.signal?.aborted).toBe(false);
      gate.resolve(canonical);
      await expect(first).resolves.toBe(canonical);
    });

    it.each(['unknown', 'changeIdentity', 'clearState'] as const)(
      'refuses an unapproved preview after %s without dispatch',
      async (reason) => {
        const service = await quotedServiceWith();
        if (reason !== 'unknown') {
          service[reason]();
        }

        await expect(
          service.commitWithdrawPreview(
            KALSHI_VENUE_ID,
            reason === 'unknown' ? 'unknown-preview' : 'preview-1',
          ),
        ).rejects.toMatchObject({
          code: PredictErrorCode.UNAUTHENTICATED,
          metadata: { phase: 'commit', requestSent: false },
        });
        expect(commitWithdraw).not.toHaveBeenCalled();
      },
    );

    it('pins copies of both the preview and destination', async () => {
      const service = serviceWith();
      const quote = { ...preview, destination: { ...preview.destination } };
      previewWithdraw.mockResolvedValueOnce(quote);
      const approved = await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        amount: '5.00' as PredictAmount,
      });
      approved.mode = 'sweep_all';
      approved.requestedAmount = '500' as PredictAmount;
      approved.destination.address = 'changed-address';
      approved.destination.source = 'venue';

      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toMatchObject({
        mode: 'fixed',
        requestedAmount: '5.00',
        destination: preview.destination,
      });
    });

    it('accepts normalized equal amounts and venue destinations', async () => {
      const service = serviceWith();
      const destination = { ...preview.destination, source: 'venue' as const };
      previewWithdraw.mockResolvedValueOnce({
        ...preview,
        requestedAmount: '25' as PredictAmount,
        destination,
      });
      commitWithdraw.mockResolvedValueOnce(
        receipt('processing', {
          requestedAmount: '25.00' as PredictAmount,
          destination,
        }),
      );
      await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        amount: '25' as PredictAmount,
      });

      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toMatchObject({ requestedAmount: '25.00', destination });
    });

    it('refuses an expired first dispatch without calling the adapter', async () => {
      const service = serviceWith();
      previewWithdraw.mockResolvedValueOnce({
        ...preview,
        expiresAt: new Date(Date.now() - 1).toISOString() as PredictTimestamp,
      });
      await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        amount: '5.00' as PredictAmount,
      });

      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).rejects.toMatchObject({
        code: PredictErrorCode.PREVIEW_EXPIRED,
        metadata: {
          phase: 'commit',
          requestSent: false,
        },
      });
      expect(commitWithdraw).not.toHaveBeenCalled();
    });

    it.each([
      ['amount', { requestedAmount: '6' as PredictAmount }],
      ['mode', { mode: 'sweep_all' as const, requestedAmount: undefined }],
      [
        'address',
        { destination: { ...preview.destination, address: 'other-address' } },
      ],
      [
        'network',
        { destination: { ...preview.destination, network: 'other-network' } },
      ],
      [
        'source',
        { destination: { ...preview.destination, source: 'venue' as const } },
      ],
    ])(
      'rejects a different %s without losing recovery',
      async (_field, overrides) => {
        const service = await quotedServiceWith();
        const invalid = receipt(
          'processing',
          overrides as Partial<PredictWithdrawReceipt>,
        );
        commitWithdraw.mockResolvedValueOnce(invalid);
        observeWithdraw
          .mockResolvedValueOnce(invalid)
          .mockResolvedValueOnce(receipt('settled'));

        await expect(
          service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
        ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
        expect(invalidateQueries).not.toHaveBeenCalled();
        await expect(
          service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1'),
        ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
        await expect(
          service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1'),
        ).resolves.toMatchObject({ status: 'settled' });
      },
    );

    it('keeps dispatched recovery usable after expiry and an invalid receipt', async () => {
      const service = serviceWith();
      const expiresAt = '2099-03-01T12:01:00.000Z' as PredictTimestamp;
      previewWithdraw.mockResolvedValueOnce({ ...preview, expiresAt });
      await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        amount: '5.00' as PredictAmount,
      });
      commitWithdraw.mockImplementationOnce(
        (_previewId, _options, onDispatch) => {
          onDispatch?.();
          return Promise.resolve(
            receipt('processing', {
              requestedAmount: '6.00' as PredictAmount,
            }),
          );
        },
      );
      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
      const originalNow = Date.now();
      jest.mocked(Date.now).mockReturnValue(Date.parse(expiresAt) + 1);
      try {
        await expect(
          service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1'),
        ).resolves.toMatchObject({ status: 'processing' });
        await expect(
          service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
        ).resolves.toMatchObject({ status: 'processing' });
        expect(commitWithdraw).toHaveBeenCalledTimes(2);
      } finally {
        jest.mocked(Date.now).mockReturnValue(originalNow);
      }
    });

    it('does not detach a new session commit when the old one settles', async () => {
      const service = await quotedServiceWith();
      const oldGate = deferred<PredictWithdrawReceipt>();
      const newGate = deferred<PredictWithdrawReceipt>();
      commitWithdraw
        .mockReturnValueOnce(oldGate.promise)
        .mockReturnValueOnce(newGate.promise);
      const oldCommit = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );
      // Captured, not awaited: `changeIdentity()` below is what rejects it.
      // eslint-disable-next-line jest/valid-expect -- awaited below
      const abandoned = expect(oldCommit).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      await Promise.resolve();
      service.changeIdentity();
      await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        amount: '5' as PredictAmount,
      });
      const newCommit = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );
      oldGate.resolve(receipt('processing'));
      await abandoned;

      expect(service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1')).toBe(
        newCommit,
      );
      newGate.resolve(receipt('processing'));
      await expect(newCommit).resolves.toMatchObject({ status: 'processing' });
      expect(commitWithdraw).toHaveBeenCalledTimes(2);
    });

    it('cancels only the caller waiting, not the shared commit', async () => {
      const service = await quotedServiceWith();
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
      await Promise.resolve();
      expect(signal).not.toBe(caller.signal);
      expect(signal?.aborted).toBe(false);

      caller.abort();
      // Captured, not awaited: the shared commit keeps running past it.
      // eslint-disable-next-line jest/valid-expect -- awaited below
      const cancelled = expect(pending).rejects.toMatchObject({
        name: 'AbortError',
      });
      expect(signal?.aborted).toBe(false);
      await cancelled;
      gate.resolve(receipt('processing'));
      await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      expect(commitWithdraw).toHaveBeenCalledTimes(1);
      expect(invalidateQueries.mock.calls).toEqual(invalidations());
    });

    it('aborts a commit still resolving its token when abandoned', async () => {
      const service = await quotedServiceWith();
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
      await Promise.resolve();
      expect(signal?.aborted).toBe(false);

      service.changeIdentity();
      expect(signal?.aborted).toBe(true);
      gate.resolve(receipt('processing'));

      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('aborts a commit still resolving its token when destroyed', async () => {
      const service = await quotedServiceWith();
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
      await Promise.resolve();
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
      const service = await quotedServiceWith();
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
      const service = await quotedServiceWith();
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

  describe('reconcileWithdrawCommit', () => {
    it('returns the receipt and does not read when the commit is answered', async () => {
      const service = await quotedServiceWith();
      const canonical = receipt('processing');
      commitWithdraw.mockResolvedValueOnce(canonical);

      await expect(
        service.reconcileWithdrawCommit(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toEqual({ outcome: 'receipt', receipt: canonical });

      expect(observeWithdraw).not.toHaveBeenCalled();
    });

    it('treats an expired preview as not placed and sends nothing', async () => {
      previewWithdraw.mockResolvedValueOnce({
        ...preview,
        expiresAt: new Date(Date.now() - 1).toISOString() as PredictTimestamp,
      });
      const service = serviceWith();
      await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        amount: preview.requestedAmount as PredictAmount,
      });

      const resolution = await service.reconcileWithdrawCommit(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(resolution).toMatchObject({
        outcome: 'not_placed',
        error: expect.objectContaining({
          code: PredictErrorCode.PREVIEW_EXPIRED,
        }),
      });
      expect(commitWithdraw).not.toHaveBeenCalled();
      expect(observeWithdraw).not.toHaveBeenCalled();
    });

    it('keeps an unauthenticated commit unknown and does not read it', async () => {
      const service = await quotedServiceWith();
      const error = PredictError.from(PredictErrorCode.UNAUTHENTICATED);
      commitWithdraw.mockRejectedValueOnce(error);

      await expect(
        service.reconcileWithdrawCommit(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toEqual({ outcome: 'unknown', error });

      expect(observeWithdraw).not.toHaveBeenCalled();
    });

    it.each(['AbortError', 'TimeoutError'])(
      'reads the same preview after a %s commit',
      async (name) => {
        const service = await quotedServiceWith();
        const lost = new Error('Commit deadline reached');
        lost.name = name;
        const settled = receipt('settled');
        commitWithdraw.mockRejectedValueOnce(lost);
        observeWithdraw.mockResolvedValueOnce(settled);

        await expect(
          service.reconcileWithdrawCommit(KALSHI_VENUE_ID, 'preview-1'),
        ).resolves.toEqual({ outcome: 'receipt', receipt: settled });

        expect(commitWithdraw).toHaveBeenCalledTimes(1);
        expect(observeWithdraw).toHaveBeenCalledTimes(1);
      },
    );

    it('quotes again when the recovery read finds no operation', async () => {
      const service = await quotedServiceWith();
      const readError = PredictError.from(
        PredictErrorCode.ORDER_OUTCOME_UNKNOWN,
        { metadata: { bodyCode: 'operation_not_found', phase: 'observe' } },
      );
      commitWithdraw.mockRejectedValueOnce(new TypeError('Connection lost'));
      observeWithdraw.mockRejectedValueOnce(readError);

      await expect(
        service.reconcileWithdrawCommit(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toEqual({ outcome: 'not_placed', error: readError });

      expect(commitWithdraw).toHaveBeenCalledTimes(1);
      expect(observeWithdraw).toHaveBeenCalledTimes(1);
    });

    it('resolves a commit the API refused with not_placed without a read', async () => {
      const service = await quotedServiceWith();
      const refused = PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE, {
        metadata: {
          phase: 'commit',
          bodyCode: 'venue_unavailable',
          outcome: 'not_placed',
        },
      });
      commitWithdraw.mockRejectedValueOnce(refused);

      await expect(
        service.reconcileWithdrawCommit(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toEqual({ outcome: 'not_placed', error: refused });
      expect(observeWithdraw).not.toHaveBeenCalled();
    });

    it.each([
      ['an unknown outcome', { outcome: 'unknown' }],
      ['no outcome', {}],
    ])(
      'reads the operation after a commit failure with %s, whatever its code',
      async (_name, body) => {
        const service = await quotedServiceWith();
        const failed = PredictError.from(PredictErrorCode.VENUE_UNAVAILABLE, {
          metadata: {
            phase: 'commit',
            bodyCode: 'insufficient_balance',
            requestSent: true,
            ...body,
          },
        });
        commitWithdraw.mockRejectedValueOnce(failed);
        observeWithdraw.mockRejectedValueOnce(new TypeError('Still offline'));

        await expect(
          service.reconcileWithdrawCommit(KALSHI_VENUE_ID, 'preview-1'),
        ).resolves.toMatchObject({ outcome: 'unknown' });
        expect(observeWithdraw).toHaveBeenCalledTimes(1);
      },
    );

    it('keeps a lost commit unknown when the recovery read also fails', async () => {
      const service = await quotedServiceWith();
      commitWithdraw.mockRejectedValueOnce(new TypeError('Connection lost'));
      observeWithdraw.mockRejectedValueOnce(new TypeError('Still offline'));

      const resolution = await service.reconcileWithdrawCommit(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(resolution).toMatchObject({
        outcome: 'unknown',
        error: expect.objectContaining({ code: PredictErrorCode.UNKNOWN }),
      });
      expect(
        resolution.outcome === 'unknown' && resolution.error,
      ).toBeInstanceOf(PredictError);
    });
  });

  describe('reconcileWithdrawObservation', () => {
    it('reads the same preview and never commits', async () => {
      const service = await quotedServiceWith();
      const settled = receipt('settled');
      const prior = PredictError.from(PredictErrorCode.UNAUTHENTICATED);
      observeWithdraw.mockResolvedValueOnce(settled);

      await expect(
        service.reconcileWithdrawObservation(
          KALSHI_VENUE_ID,
          'preview-1',
          prior,
        ),
      ).resolves.toEqual({ outcome: 'receipt', receipt: settled });

      expect(commitWithdraw).not.toHaveBeenCalled();
    });

    it('keeps the prior error when the read fails without a Predict error', async () => {
      const service = await quotedServiceWith();
      const prior = PredictError.from(PredictErrorCode.UNAUTHENTICATED);
      observeWithdraw.mockRejectedValueOnce(new TypeError('Still offline'));

      await expect(
        service.reconcileWithdrawObservation(
          KALSHI_VENUE_ID,
          'preview-1',
          prior,
        ),
      ).resolves.toEqual({ outcome: 'unknown', error: prior });

      expect(commitWithdraw).not.toHaveBeenCalled();
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
      expect(observeWithdraw.mock.calls).toEqual([
        ['preview-1', { signal: expect.any(AbortSignal) }],
      ]);
      expect(commitWithdraw).not.toHaveBeenCalled();
    });

    it('forwards caller cancellation and keeps its AbortError', async () => {
      const service = serviceWith();
      const caller = new AbortController();
      const gate = deferred<PredictWithdrawReceipt>();
      let signal: AbortSignal | undefined;
      observeWithdraw.mockImplementationOnce((_previewId, options) => {
        signal = options?.signal;
        return gate.promise;
      });

      const pending = service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1', {
        signal: caller.signal,
      });
      expect(signal).not.toBe(caller.signal);
      caller.abort();
      expect(signal?.aborted).toBe(true);
      const abortError = new Error('The request was aborted.');
      abortError.name = 'AbortError';
      gate.reject(abortError);

      await expect(pending).rejects.toBe(abortError);
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('aborts observation on lock without forgetting the approved preview', async () => {
      const service = await quotedServiceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      observeWithdraw.mockReturnValueOnce(gate.promise);
      const pending = service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');

      service.stopObserving();

      expect(observeWithdraw.mock.calls[0][1]?.signal?.aborted).toBe(true);
      gate.resolve(receipt('processing'));
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
      expect(invalidateQueries).not.toHaveBeenCalled();
      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toMatchObject({ status: 'processing' });
    });

    it('aborts an observation still resolving its token when abandoned', async () => {
      const service = serviceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      let signal: AbortSignal | undefined;
      observeWithdraw.mockImplementationOnce((_previewId, options) => {
        signal = options?.signal;
        return gate.promise;
      });

      const pending = service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');
      expect(signal?.aborted).toBe(false);

      service.changeIdentity();
      expect(signal?.aborted).toBe(true);
      gate.resolve(receipt('processing'));

      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('aborts an observation still resolving its token when destroyed', async () => {
      const service = serviceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      let signal: AbortSignal | undefined;
      observeWithdraw.mockImplementationOnce((_previewId, options) => {
        signal = options?.signal;
        return gate.promise;
      });

      const pending = service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');
      expect(signal?.aborted).toBe(false);

      service.destroy();
      expect(signal?.aborted).toBe(true);
      gate.resolve(receipt('processing'));

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
        if (method === 'commit') {
          await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
            amount: '5.00' as PredictAmount,
          });
        }
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
      const service = await quotedServiceWith();
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
        const service = await quotedServiceWith();
        commitWithdraw.mockResolvedValueOnce(receipt(status));
        observeWithdraw.mockResolvedValueOnce(receipt(status));

        await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
        await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');

        expect(invalidateQueries).not.toHaveBeenCalled();
      },
    );

    it('tracks status separately for each preview', async () => {
      const service = await quotedServiceWith();
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
        const service = await quotedServiceWith();
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

  describe('changeIdentity', () => {
    it('forgets receipt statuses so the next processing receipt invalidates again', async () => {
      const service = await quotedServiceWith();
      await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      invalidateQueries.mockClear();

      service.changeIdentity();
      await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');

      expect(invalidateQueries.mock.calls).toEqual(invalidations());
    });

    it.each(['commit', 'observe'] as const)(
      'discards an in-flight %s after the Predict User changes',
      async (method) => {
        const service = await quotedServiceWith();
        const gate = deferred<PredictWithdrawReceipt>();
        commitWithdraw.mockReturnValueOnce(gate.promise);
        observeWithdraw.mockReturnValueOnce(gate.promise);

        const pending =
          method === 'commit'
            ? service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1')
            : service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');
        service.changeIdentity();
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
        metadata: { phase: 'commit', requestSent: false },
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
