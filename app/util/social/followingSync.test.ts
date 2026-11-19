import Engine from '../../core/Engine';
import {
  resetFollowingSyncForTests,
  resyncFollowingIfSyncInFlight,
  syncFollowingState,
} from './followingSync';

jest.mock('../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

const mockCall = Engine.controllerMessenger.call as jest.Mock;

const deferred = () => {
  let resolve: (value: unknown) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('followingSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFollowingSyncForTests();
    mockCall.mockResolvedValue({ following: [] });
  });

  describe('syncFollowingState', () => {
    it('calls SocialController:updateFollowing and returns its result', async () => {
      const response = { following: [{ profileId: 'trader-1' }] };
      mockCall.mockResolvedValueOnce(response);

      await expect(syncFollowingState()).resolves.toBe(response);
      expect(mockCall).toHaveBeenCalledWith('SocialController:updateFollowing');
    });

    it('propagates an updateFollowing rejection', async () => {
      const error = new Error('network');
      mockCall.mockRejectedValueOnce(error);

      await expect(syncFollowingState()).rejects.toBe(error);
    });
  });

  describe('resyncFollowingIfSyncInFlight', () => {
    it('does nothing when no sync is in flight', async () => {
      await resyncFollowingIfSyncInFlight();

      expect(mockCall).not.toHaveBeenCalled();
    });

    it('does nothing once the previous sync has settled', async () => {
      await syncFollowingState();
      await Promise.resolve();
      mockCall.mockClear();

      await resyncFollowingIfSyncInFlight();

      expect(mockCall).not.toHaveBeenCalled();
    });

    it('waits for an in-flight sync, then syncs again', async () => {
      const first = deferred();
      mockCall.mockReturnValueOnce(first.promise);
      syncFollowingState();

      const resync = resyncFollowingIfSyncInFlight();
      await Promise.resolve();
      expect(mockCall).toHaveBeenCalledTimes(1);

      first.resolve({ following: [] });
      await resync;

      expect(mockCall).toHaveBeenCalledTimes(2);
      expect(mockCall).toHaveBeenLastCalledWith(
        'SocialController:updateFollowing',
      );
    });

    it('still syncs again when the in-flight sync rejects', async () => {
      const first = deferred();
      mockCall.mockReturnValueOnce(first.promise);
      syncFollowingState().catch(() => undefined);

      const resync = resyncFollowingIfSyncInFlight();
      first.reject(new Error('network'));
      await resync;

      expect(mockCall).toHaveBeenCalledTimes(2);
    });
  });
});
