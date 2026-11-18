import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';

import { PredictError, PredictErrorCode } from '../errors';
import {
  PREDICT_FUNDING_SERVICE_NAME,
  PredictFundingService,
  type PredictFundingServiceActions,
  type PredictFundingServiceMessenger,
} from './PredictFundingService';
import {
  type PredictAmount,
  type PredictTimestamp,
  type PredictVenueId,
  type PredictWithdrawPreview,
  type PredictWithdrawReceipt,
  type PredictWithdrawReceiptStatus,
} from '../types';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';

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
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const previewWithdraw = jest.fn<
  Promise<PredictWithdrawPreview>,
  [unknown, { signal?: AbortSignal }?]
>();
const commitWithdraw = jest.fn<
  Promise<PredictWithdrawReceipt>,
  [string, { signal?: AbortSignal }?]
>();
const observeWithdraw = jest.fn<
  Promise<PredictWithdrawReceipt>,
  [string, { signal?: AbortSignal }?]
>();
const invalidateQueries = jest.fn<Promise<void>, [unknown]>();

const funding = { previewWithdraw, commitWithdraw, observeWithdraw };

const services: PredictFundingService[] = [];

const serviceWith = (): PredictFundingService => {
  const rootMessenger = new Messenger<
    MockAnyNamespace,
    PredictFundingServiceActions,
    never
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
    funding,
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

describe('PredictFundingService', () => {
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
      expect(commitWithdraw.mock.calls).toEqual([['preview-1', undefined]]);
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
  });

  describe.each(['preview', 'commit', 'observe'] as const)(
    '%s contract',
    (method) => {
      const invoke = (
        service: PredictFundingService,
        venueId = KALSHI_VENUE_ID,
      ) => {
        if (method === 'preview') {
          return service.requestWithdrawPreview(venueId, { sweepAll: true });
        }
        return method === 'commit'
          ? service.commitWithdrawPreview(venueId, 'preview-1')
          : service.observeWithdraw(venueId, 'preview-1');
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
