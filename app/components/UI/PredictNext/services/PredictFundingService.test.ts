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
  type PredictFundingServiceEvents,
  type PredictFundingServiceMessenger,
  type PredictFundingServiceOptions,
  type PredictWithdrawObserver,
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
import type { NetworkTier } from '../../../../hooks/useNetworkTier';

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

/** Every service a test builds; destroyed after each test so no observation
 * timer survives into the next one. */
const services: PredictFundingService[] = [];

/** Drives the AppState the service listens to. */
let appStateListener: ((state: string) => void) | undefined;

const serviceWith = (
  options: Partial<
    Pick<
      PredictFundingServiceOptions,
      'observationDelaysMs' | 'slowCellularMultiplier' | 'venueId'
    >
  > = {},
): PredictFundingService => {
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
  const created = new PredictFundingService({
    messenger,
    funding,
    venueId: KALSHI_VENUE_ID,
    AppState: {
      currentState: 'active',
      addEventListener: (
        _type: string,
        listener: (state: string) => void,
      ) => {
        appStateListener = listener;
        return {
          remove: () => {
            appStateListener = undefined;
          },
        };
      },
    } as unknown as PredictFundingServiceOptions['AppState'],
    ...options,
  });
  services.push(created);
  return created;
};

beforeEach(() => {
  previewWithdraw.mockReset();
  previewWithdraw.mockResolvedValue(preview);
  commitWithdraw.mockReset();
  commitWithdraw.mockResolvedValue(receipt('processing'));
  observeWithdraw.mockReset();
  invalidateQueries.mockReset();
  invalidateQueries.mockResolvedValue(undefined);
  appStateListener = undefined;
});

afterEach(() => {
  services.splice(0).forEach((created) => created.destroy());
  jest.useRealTimers();
});

interface MockObserver extends PredictWithdrawObserver {
  onReceipt: jest.Mock;
  getNetworkTier: jest.Mock<NetworkTier | null, []>;
}

const observerWith = (overrides: Partial<MockObserver> = {}): MockObserver => ({
  onReceipt: jest.fn(),
  getNetworkTier: jest.fn<NetworkTier | null, []>(() => 'WIFI'),
  ...overrides,
});

describe('PredictFundingService', () => {
  describe('requestWithdrawPreview', () => {
    it('quotes a fixed amount without caching or transforming it', async () => {
      const service = serviceWith();

      const quoted = await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        amount: '5.00' as PredictAmount,
      });

      expect(quoted).toBe(preview);
      expect(previewWithdraw).toHaveBeenCalledWith(
        { amount: '5.00' },
        undefined,
      );
    });

    it('quotes a sweep with the whole-balance intent', async () => {
      const service = serviceWith();

      await service.requestWithdrawPreview(KALSHI_VENUE_ID, { sweepAll: true });

      expect(previewWithdraw).toHaveBeenCalledWith({ sweepAll: true }, undefined);
    });

    it('refuses a Venue this service does not serve', async () => {
      const service = serviceWith();

      await expect(
        service.requestWithdrawPreview('polymarket' as PredictVenueId, {
          sweepAll: true,
        }),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNSUPPORTED_VENUE });
      expect(previewWithdraw).not.toHaveBeenCalled();
    });

    it('surfaces the backend error unchanged', async () => {
      const service = serviceWith();
      const failure = PredictError.from(PredictErrorCode.AMOUNT_BELOW_MINIMUM);
      previewWithdraw.mockRejectedValueOnce(failure);

      await expect(
        service.requestWithdrawPreview(KALSHI_VENUE_ID, {
          amount: '0.50' as PredictAmount,
        }),
      ).rejects.toBe(failure);
    });

    it('discards a quote that lands after the Predict User was replaced', async () => {
      const service = serviceWith();
      const pending = service.requestWithdrawPreview(KALSHI_VENUE_ID, {
        sweepAll: true,
      });

      service.abandonObservation();

      await expect(pending).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
    });
  });

  describe('commitWithdrawPreview', () => {
    it('commits by reference and returns the canonical receipt', async () => {
      const service = serviceWith();

      const result = await service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );

      expect(result.status).toBe('processing');
      expect(commitWithdraw).toHaveBeenCalledWith('preview-1');
    });

    it('coalesces concurrent commits of one Preview into a single request', async () => {
      const service = serviceWith();
      const gate = deferred<PredictWithdrawReceipt>();
      commitWithdraw.mockImplementationOnce(() => gate.promise);

      const first = service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      const second = service.commitWithdrawPreview(
        KALSHI_VENUE_ID,
        'preview-1',
      );
      gate.resolve(receipt('processing'));

      await expect(first).resolves.toMatchObject({ status: 'processing' });
      await expect(second).resolves.toMatchObject({ status: 'processing' });
      expect(commitWithdraw).toHaveBeenCalledTimes(1);
    });

    it('allows a later commit of the same Preview after the first settles', async () => {
      const service = serviceWith();

      await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');

      expect(commitWithdraw).toHaveBeenCalledTimes(2);
    });

    it('refuses to commit against another Venue', () => {
      const service = serviceWith();

      // A Commit returns its coalesced promise, so a Venue mismatch throws
      // before one is created.
      expect(() =>
        service.commitWithdrawPreview(
          'polymarket' as PredictVenueId,
          'preview-1',
        ),
      ).toThrow(
        expect.objectContaining({ code: PredictErrorCode.UNSUPPORTED_VENUE }),
      );
      expect(commitWithdraw).not.toHaveBeenCalled();
    });
  });

  describe('observeWithdraw', () => {
    it('reads the receipt without submitting', async () => {
      const service = serviceWith();
      observeWithdraw.mockResolvedValueOnce(receipt('settled'));

      const result = await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');

      expect(result.status).toBe('settled');
      expect(observeWithdraw).toHaveBeenCalledWith('preview-1');
      expect(commitWithdraw).not.toHaveBeenCalled();
    });
  });

  describe('portfolio invalidation', () => {
    it('invalidates every portfolio read when a commit lands in processing', async () => {
      const service = serviceWith();

      await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');

      expect(invalidateQueries.mock.calls.map(([request]) => request)).toEqual([
        { queryKey: ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID] },
        { queryKey: ['PredictPortfolioService:getPositions', KALSHI_VENUE_ID] },
        { queryKey: ['PredictPortfolioService:getActivity', KALSHI_VENUE_ID] },
        {
          queryKey: [
            'PredictPortfolioService:getPortfolioSummary',
            KALSHI_VENUE_ID,
          ],
        },
      ]);
    });

    it('invalidates once per status transition, not once per read', async () => {
      const service = serviceWith();
      commitWithdraw.mockResolvedValueOnce(receipt('processing'));
      observeWithdraw.mockResolvedValue(receipt('processing'));

      await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');
      invalidateQueries.mockClear();
      await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');
      expect(invalidateQueries).not.toHaveBeenCalled();

      observeWithdraw.mockResolvedValueOnce(receipt('settled'));
      await service.observeWithdraw(KALSHI_VENUE_ID, 'preview-1');
      expect(invalidateQueries).toHaveBeenCalledTimes(4);
    });

    it('does not invalidate for a rejected receipt, which moved no money', async () => {
      const service = serviceWith();
      commitWithdraw.mockResolvedValueOnce(
        receipt('rejected', {
          rejectionCode: 'insufficient_balance',
          withdrawnAmount: null,
        }),
      );

      await service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1');

      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('keeps the commit successful when the invalidation fails', async () => {
      const service = serviceWith();
      invalidateQueries.mockRejectedValue(new Error('invalidate failed'));

      await expect(
        service.commitWithdrawPreview(KALSHI_VENUE_ID, 'preview-1'),
      ).resolves.toMatchObject({ status: 'processing' });
    });
  });

  describe('followOperation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('reads the receipt on each backoff step until it settles', async () => {
      const service = serviceWith({ observationDelaysMs: [10, 20] });
      const observer = observerWith();
      observeWithdraw
        .mockResolvedValueOnce(receipt('processing'))
        .mockResolvedValueOnce(receipt('settled'));

      const unsubscribe = service.followOperation('preview-1', observer);

      await jest.advanceTimersByTimeAsync(10);
      expect(observeWithdraw).toHaveBeenCalledTimes(1);
      expect(observer.onReceipt).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'processing' }),
      );

      await jest.advanceTimersByTimeAsync(20);
      expect(observeWithdraw).toHaveBeenCalledTimes(2);
      expect(observer.onReceipt).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'settled' }),
      );

      await jest.advanceTimersByTimeAsync(1_000);
      expect(observeWithdraw).toHaveBeenCalledTimes(2);
      unsubscribe();
    });

    it('repeats the last delay once the schedule runs out', async () => {
      const service = serviceWith({ observationDelaysMs: [10] });
      observeWithdraw.mockResolvedValue(receipt('processing'));
      const unsubscribe = service.followOperation(
        'preview-1',
        observerWith(),
      );

      await jest.advanceTimersByTimeAsync(10);
      await jest.advanceTimersByTimeAsync(10);
      await jest.advanceTimersByTimeAsync(10);

      expect(observeWithdraw).toHaveBeenCalledTimes(3);
      unsubscribe();
    });

    it('doubles each step on a slow cellular connection', async () => {
      const service = serviceWith({
        observationDelaysMs: [10],
        slowCellularMultiplier: 2,
      });
      observeWithdraw.mockResolvedValue(receipt('processing'));
      const unsubscribe = service.followOperation(
        'preview-1',
        observerWith({
          getNetworkTier: jest.fn<NetworkTier | null, []>(
            () => 'SLOW_CELLULAR',
          ),
        }),
      );

      await jest.advanceTimersByTimeAsync(19);
      expect(observeWithdraw).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      expect(observeWithdraw).toHaveBeenCalledTimes(1);
      unsubscribe();
    });

    it('skips a read with no connection and re-arms at the same step', async () => {
      const service = serviceWith({ observationDelaysMs: [10, 100] });
      const getNetworkTier = jest.fn<NetworkTier | null, []>(() => 'NONE');
      observeWithdraw.mockResolvedValue(receipt('processing'));
      const unsubscribe = service.followOperation(
        'preview-1',
        observerWith({ getNetworkTier }),
      );

      await jest.advanceTimersByTimeAsync(10);
      expect(observeWithdraw).not.toHaveBeenCalled();

      getNetworkTier.mockReturnValue('WIFI');
      await jest.advanceTimersByTimeAsync(10);
      expect(observeWithdraw).toHaveBeenCalledTimes(1);
      unsubscribe();
    });

    it('stops polling when the backend asks for manual review', async () => {
      const service = serviceWith({ observationDelaysMs: [10] });
      observeWithdraw.mockResolvedValue(
        receipt('processing', { needsManualReview: true }),
      );
      const observer = observerWith();
      const unsubscribe = service.followOperation('preview-1', observer);

      await jest.advanceTimersByTimeAsync(10);
      await jest.advanceTimersByTimeAsync(1_000);

      expect(observeWithdraw).toHaveBeenCalledTimes(1);
      expect(observer.onReceipt).toHaveBeenCalledWith(
        expect.objectContaining({ needsManualReview: true }),
      );
      unsubscribe();
    });

    it('keeps the last receipt and tries again when a read fails', async () => {
      const service = serviceWith({ observationDelaysMs: [10] });
      const observer = observerWith();
      const unsubscribe = service.followOperation('preview-1', observer);
      observeWithdraw
        .mockResolvedValueOnce(receipt('processing'))
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(receipt('settled'));

      await jest.advanceTimersByTimeAsync(10);
      await jest.advanceTimersByTimeAsync(10);
      expect(observer.onReceipt).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'processing' }),
      );

      await jest.advanceTimersByTimeAsync(10);
      expect(observer.onReceipt).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'settled' }),
      );
      unsubscribe();
    });

    it('stops reading once the last surface unsubscribes', async () => {
      const service = serviceWith({ observationDelaysMs: [10] });
      const unsubscribe = service.followOperation(
        'preview-1',
        observerWith(),
      );

      unsubscribe();
      await jest.advanceTimersByTimeAsync(1_000);

      expect(observeWithdraw).not.toHaveBeenCalled();
    });

    it('hands the known receipt to a surface that subscribes later', async () => {
      const service = serviceWith({ observationDelaysMs: [10] });
      observeWithdraw.mockResolvedValue(receipt('processing'));
      const first = service.followOperation('preview-1', observerWith());
      await jest.advanceTimersByTimeAsync(10);
      first();

      const late = observerWith();
      const unsubscribe = service.followOperation('preview-1', late);

      expect(late.onReceipt).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'processing' }),
      );
      unsubscribe();
    });

    it('pauses while the app is not active and resumes when it returns', async () => {
      const service = serviceWith({ observationDelaysMs: [10] });
      observeWithdraw.mockResolvedValue(receipt('processing'));
      const unsubscribe = service.followOperation(
        'preview-1',
        observerWith(),
      );

      appStateListener?.('background');
      await jest.advanceTimersByTimeAsync(1_000);
      expect(observeWithdraw).not.toHaveBeenCalled();

      appStateListener?.('active');
      await jest.advanceTimersByTimeAsync(10);
      expect(observeWithdraw).toHaveBeenCalledTimes(1);
      unsubscribe();
    });
  });

  describe('abandonObservation', () => {
    it('stops every observation and forgets the receipts', async () => {
      jest.useFakeTimers();
      const service = serviceWith({ observationDelaysMs: [10] });
      observeWithdraw.mockResolvedValue(receipt('processing'));
      const observer = observerWith();
      service.followOperation('preview-1', observer);
      await jest.advanceTimersByTimeAsync(10);
      expect(service.getDestination('preview-1')).toEqual(preview.destination);

      service.abandonObservation();
      await jest.advanceTimersByTimeAsync(1_000);

      expect(observeWithdraw).toHaveBeenCalledTimes(1);
      expect(service.getDestination('preview-1')).toBeUndefined();
    });

    it('does not let an in-flight read land after the Predict User changed', async () => {
      jest.useFakeTimers();
      const service = serviceWith({ observationDelaysMs: [10] });
      const observer = observerWith();
      const gate = deferred<PredictWithdrawReceipt>();
      observeWithdraw.mockImplementationOnce(() => gate.promise);
      service.followOperation('preview-1', observer);
      await jest.advanceTimersByTimeAsync(10);

      service.abandonObservation();
      gate.resolve(receipt('settled'));
      await jest.advanceTimersByTimeAsync(0);

      expect(observer.onReceipt).not.toHaveBeenCalled();
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle', () => {
    it('runs the registered cleanup on destroy', () => {
      const service = serviceWith();
      const cleanup = jest.fn();
      service.setLifecycleCleanup(cleanup);

      service.destroy();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('stops observing after destroy', async () => {
      jest.useFakeTimers();
      const service = serviceWith({ observationDelaysMs: [10] });
      observeWithdraw.mockResolvedValue(receipt('processing'));
      service.followOperation('preview-1', observerWith());

      service.destroy();
      await jest.advanceTimersByTimeAsync(1_000);

      expect(observeWithdraw).not.toHaveBeenCalled();
    });
  });
});
