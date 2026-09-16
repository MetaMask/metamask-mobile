import {
  __resetForTest,
  ensureResolved,
  getSnapshot,
  refresh,
  reset,
  subscribe,
} from './entitlementResolution';
import Engine from '../Engine';
import Logger from '../../util/Logger';

jest.mock('../Engine', () => ({
  context: {
    SubscriptionController: {
      getSubscriptions: jest.fn(),
    },
  },
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockGetSubscriptions = jest.mocked(
  Engine.context.SubscriptionController.getSubscriptions,
);

describe('entitlementResolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetForTest();
    mockGetSubscriptions.mockResolvedValue([]);
  });

  describe('ensureResolved', () => {
    it('starts idle and reports resolved after a successful fetch', async () => {
      expect(getSnapshot()).toBe('idle');

      await ensureResolved();

      expect(getSnapshot()).toBe('resolved');
      expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
    });

    it('does not refetch once resolved', async () => {
      await ensureResolved();
      await ensureResolved();

      expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
    });

    it('shares one request between concurrent callers', async () => {
      await Promise.all([ensureResolved(), ensureResolved(), ensureResolved()]);

      expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
      expect(getSnapshot()).toBe('resolved');
    });

    it('reports error and logs when the fetch fails', async () => {
      const error = new Error('network down');
      mockGetSubscriptions.mockRejectedValue(error);

      await ensureResolved();

      expect(getSnapshot()).toBe('error');
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        '[entitlementResolution] Failed to resolve subscription entitlements',
      );
    });

    it('retries after a failure', async () => {
      mockGetSubscriptions.mockRejectedValueOnce(new Error('network down'));

      await ensureResolved();
      expect(getSnapshot()).toBe('error');

      await ensureResolved();

      expect(getSnapshot()).toBe('resolved');
      expect(mockGetSubscriptions).toHaveBeenCalledTimes(2);
    });
  });

  describe('refresh', () => {
    it('refetches even when already resolved', async () => {
      await ensureResolved();

      await refresh();

      expect(mockGetSubscriptions).toHaveBeenCalledTimes(2);
      expect(getSnapshot()).toBe('resolved');
    });

    it('joins an in-flight request instead of issuing a second one', async () => {
      await Promise.all([ensureResolved(), refresh()]);

      expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset', () => {
    it('clears resolution so the next caller refetches', async () => {
      await ensureResolved();

      reset();

      expect(getSnapshot()).toBe('idle');

      await ensureResolved();

      expect(mockGetSubscriptions).toHaveBeenCalledTimes(2);
    });

    it('discards a request that was already in flight', async () => {
      let completeFetch: (value: never[]) => void = () => undefined;
      mockGetSubscriptions.mockReturnValue(
        new Promise((resolve) => {
          completeFetch = resolve;
        }),
      );

      const pending = ensureResolved();
      reset();
      completeFetch([]);
      await pending;

      // The orphaned fetch must not mark the store resolved, or the next user
      // would inherit the previous session's entitlements.
      expect(getSnapshot()).toBe('idle');

      mockGetSubscriptions.mockResolvedValue([]);
      await ensureResolved();

      expect(mockGetSubscriptions).toHaveBeenCalledTimes(2);
    });

    it('discards a failure from a request that was already in flight', async () => {
      let failFetch: (error: Error) => void = () => undefined;
      mockGetSubscriptions.mockReturnValue(
        new Promise((_resolve, reject) => {
          failFetch = reject;
        }),
      );

      const pending = ensureResolved();
      reset();
      failFetch(new Error('network down'));
      await pending;

      expect(getSnapshot()).toBe('idle');
    });
  });

  describe('subscribe', () => {
    it('notifies listeners on each status change', async () => {
      const listener = jest.fn();
      subscribe(listener);

      await ensureResolved();

      // loading, then resolved
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('does not notify for a repeated status', () => {
      const listener = jest.fn();
      subscribe(listener);

      reset();

      expect(listener).not.toHaveBeenCalled();
    });

    it('stops notifying after unsubscribe', async () => {
      const listener = jest.fn();
      const unsubscribe = subscribe(listener);

      unsubscribe();
      await ensureResolved();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
