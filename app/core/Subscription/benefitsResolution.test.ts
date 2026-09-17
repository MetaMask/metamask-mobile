import {
  __resetForTest,
  ensureResolved,
  getSnapshot,
  refresh,
  reset,
  subscribe,
} from './benefitsResolution';
import Engine from '../Engine';
import Logger from '../../util/Logger';

jest.mock('../Engine', () => ({
  context: {
    SubscriptionController: {
      getBenefits: jest.fn(),
    },
  },
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockGetBenefits = jest.mocked(
  Engine.context.SubscriptionController.getBenefits,
);

describe('benefitsResolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetForTest();
    mockGetBenefits.mockResolvedValue({
      eligible: true,
      billingPeriodId: 'bp_1',
      products: {
        swaps: {
          feeBips: '0',
          remainingMicroUsd: 0,
          exhausted: false,
        },
        perps: {
          builderFeeBips: '0',
          builderCode: null,
          remainingMicroUsd: 0,
          exhausted: false,
        },
        predict: {
          builderCode: null,
          remainingTxCount: 0,
          exhausted: false,
        },
      },
    });
  });

  describe('ensureResolved', () => {
    it('starts idle and reports resolved after a successful fetch', async () => {
      expect(getSnapshot()).toBe('idle');

      await ensureResolved();

      expect(getSnapshot()).toBe('resolved');
      expect(mockGetBenefits).toHaveBeenCalledTimes(1);
    });

    it('does not refetch once resolved', async () => {
      await ensureResolved();
      await ensureResolved();

      expect(mockGetBenefits).toHaveBeenCalledTimes(1);
    });

    it('shares one request between concurrent callers', async () => {
      await Promise.all([ensureResolved(), ensureResolved(), ensureResolved()]);

      expect(mockGetBenefits).toHaveBeenCalledTimes(1);
      expect(getSnapshot()).toBe('resolved');
    });

    it('reports error and logs when the fetch fails', async () => {
      const error = new Error('network down');
      mockGetBenefits.mockRejectedValue(error);

      await ensureResolved();

      expect(getSnapshot()).toBe('error');
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        '[benefitsResolution] Failed to resolve subscription benefits',
      );
    });
  });

  describe('refresh', () => {
    it('refetches even when already resolved', async () => {
      await ensureResolved();

      await refresh();

      expect(mockGetBenefits).toHaveBeenCalledTimes(2);
      expect(getSnapshot()).toBe('resolved');
    });
  });

  describe('reset', () => {
    it('clears resolution so the next caller refetches', async () => {
      await ensureResolved();

      reset();

      expect(getSnapshot()).toBe('idle');

      await ensureResolved();

      expect(mockGetBenefits).toHaveBeenCalledTimes(2);
    });

    it('discards a request that was already in flight', async () => {
      let completeFetch: () => void = () => undefined;
      mockGetBenefits.mockReturnValue(
        new Promise((resolve) => {
          completeFetch = () =>
            resolve({
              eligible: true,
              billingPeriodId: 'bp_1',
              products: {
                swaps: {
                  feeBips: '0',
                  remainingMicroUsd: null,
                  exhausted: false,
                },
                perps: {
                  builderFeeBips: '0',
                  builderCode: null,
                  remainingMicroUsd: null,
                  exhausted: false,
                },
                predict: {
                  builderCode: null,
                  remainingTxCount: null,
                  exhausted: false,
                },
              },
            });
        }),
      );

      const pending = ensureResolved();
      reset();
      completeFetch();
      await pending;

      expect(getSnapshot()).toBe('idle');
    });
  });

  describe('subscribe', () => {
    it('notifies listeners on each status change', async () => {
      const listener = jest.fn();
      subscribe(listener);

      await ensureResolved();

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });
});
