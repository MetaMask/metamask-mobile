import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import Logger from '../../../util/Logger';
import { hydrateSocialFollowing } from './social-controller-hydration';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockMessenger: any;

jest.mock('../../Engine', () => ({
  get controllerMessenger() {
    return mockMessenger;
  },
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const LOCKED_ERROR_MESSAGE =
  'getBearerToken - unable to proceed, wallet is locked';

type TestActions =
  | {
      type: 'KeyringController:getState';
      handler: () => { isUnlocked: boolean };
    }
  | {
      type: 'AuthenticationController:getBearerToken';
      handler: () => Promise<string>;
    }
  | {
      type: 'SocialController:updateFollowing';
      handler: () => Promise<{ following: unknown[] }>;
    };

type TestEvents =
  | { type: 'KeyringController:unlock'; payload: [] }
  | { type: 'KeyringController:lock'; payload: [] };

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

/**
 * Builds a real messenger wired like the Engine: `updateFollowing` needs a
 * bearer token, and `getBearerToken` throws while the wallet is locked
 * (mirrors AuthenticationController#assertIsUnlocked).
 */
const setupMessenger = ({ isUnlocked }: { isUnlocked: boolean }) => {
  const keyringState = { isUnlocked };
  const messenger = new Messenger<string, TestActions, TestEvents>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const getBearerToken = jest.fn(async (): Promise<string> => {
    if (!keyringState.isUnlocked) {
      throw new Error(LOCKED_ERROR_MESSAGE);
    }
    return 'mock-token';
  });
  const updateFollowing = jest.fn(
    async (): Promise<{ following: unknown[] }> => {
      await messenger.call('AuthenticationController:getBearerToken');
      return { following: [] };
    },
  );

  messenger.registerActionHandler(
    'KeyringController:getState',
    () => keyringState,
  );
  messenger.registerActionHandler(
    'AuthenticationController:getBearerToken',
    getBearerToken,
  );
  messenger.registerActionHandler(
    'SocialController:updateFollowing',
    updateFollowing,
  );

  const subscribeSpy = jest.spyOn(messenger, 'subscribe');
  const unsubscribeSpy = jest.spyOn(messenger, 'unsubscribe');

  mockMessenger = messenger;

  return {
    messenger,
    getBearerToken,
    updateFollowing,
    subscribeSpy,
    unsubscribeSpy,
    unlock: () => {
      keyringState.isUnlocked = true;
      messenger.publish('KeyringController:unlock');
    },
    lock: () => {
      keyringState.isUnlocked = false;
      messenger.publish('KeyringController:lock');
    },
  };
};

const countUnlockSubscriptions = (
  subscribeSpy: jest.SpyInstance,
  unsubscribeSpy: jest.SpyInstance,
) =>
  subscribeSpy.mock.calls.filter(([e]) => e === 'KeyringController:unlock')
    .length -
  unsubscribeSpy.mock.calls.filter(([e]) => e === 'KeyringController:unlock')
    .length;

describe('hydrateSocialFollowing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the wallet is unlocked at init', () => {
    it('calls updateFollowing immediately without any options', async () => {
      const { updateFollowing, getBearerToken } = setupMessenger({
        isUnlocked: true,
      });

      await hydrateSocialFollowing();

      expect(updateFollowing).toHaveBeenCalledTimes(1);
      expect(updateFollowing).toHaveBeenCalledWith();
      expect(getBearerToken).toHaveBeenCalledTimes(1);
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('does not subscribe to KeyringController:unlock', async () => {
      const { subscribeSpy } = setupMessenger({ isUnlocked: true });

      await hydrateSocialFollowing();

      expect(subscribeSpy).not.toHaveBeenCalled();
    });

    it('does not run again on later lock/unlock cycles', async () => {
      const { updateFollowing, lock, unlock } = setupMessenger({
        isUnlocked: true,
      });

      await hydrateSocialFollowing();
      lock();
      unlock();
      await flushPromises();

      expect(updateFollowing).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the wallet is locked at init (cold start)', () => {
    it('does not request a bearer token or log an error', async () => {
      const { updateFollowing, getBearerToken } = setupMessenger({
        isUnlocked: false,
      });

      await hydrateSocialFollowing();
      await flushPromises();

      expect(updateFollowing).not.toHaveBeenCalled();
      expect(getBearerToken).not.toHaveBeenCalled();
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('hydrates exactly once after KeyringController:unlock', async () => {
      const { updateFollowing, getBearerToken, unlock } = setupMessenger({
        isUnlocked: false,
      });

      await hydrateSocialFollowing();
      unlock();
      await flushPromises();

      expect(updateFollowing).toHaveBeenCalledTimes(1);
      expect(getBearerToken).toHaveBeenCalledTimes(1);
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('hydrates only once per session across repeated lock/unlock cycles', async () => {
      const { updateFollowing, lock, unlock } = setupMessenger({
        isUnlocked: false,
      });

      await hydrateSocialFollowing();
      unlock();
      lock();
      unlock();
      lock();
      unlock();
      await flushPromises();

      expect(updateFollowing).toHaveBeenCalledTimes(1);
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('removes its unlock listener after the first unlock', async () => {
      const { subscribeSpy, unsubscribeSpy, unlock } = setupMessenger({
        isUnlocked: false,
      });

      await hydrateSocialFollowing();
      expect(countUnlockSubscriptions(subscribeSpy, unsubscribeSpy)).toBe(1);

      unlock();
      await flushPromises();

      expect(countUnlockSubscriptions(subscribeSpy, unsubscribeSpy)).toBe(0);
    });
  });

  describe('when called more than once for the same Engine', () => {
    it('registers a single unlock listener and hydrates once', async () => {
      const { updateFollowing, subscribeSpy, unsubscribeSpy, unlock } =
        setupMessenger({ isUnlocked: false });

      await hydrateSocialFollowing();
      await hydrateSocialFollowing();
      expect(countUnlockSubscriptions(subscribeSpy, unsubscribeSpy)).toBe(1);

      unlock();
      await flushPromises();
      await hydrateSocialFollowing();
      await flushPromises();

      expect(updateFollowing).toHaveBeenCalledTimes(1);
    });

    it('does not hydrate twice when already unlocked', async () => {
      const { updateFollowing } = setupMessenger({ isUnlocked: true });

      await hydrateSocialFollowing();
      await hydrateSocialFollowing();

      expect(updateFollowing).toHaveBeenCalledTimes(1);
    });
  });

  it('hydrates again for a new Engine instance (new root messenger)', async () => {
    const first = setupMessenger({ isUnlocked: true });
    await hydrateSocialFollowing();

    const second = setupMessenger({ isUnlocked: true });
    await hydrateSocialFollowing();

    expect(first.updateFollowing).toHaveBeenCalledTimes(1);
    expect(second.updateFollowing).toHaveBeenCalledTimes(1);
  });

  describe('error handling', () => {
    it('logs non-lock errors with social tags and does not throw', async () => {
      const { updateFollowing } = setupMessenger({ isUnlocked: true });
      const err = new Error('network error');
      updateFollowing.mockRejectedValueOnce(err);

      await expect(hydrateSocialFollowing()).resolves.toBeUndefined();

      expect(Logger.error).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledWith(err, {
        tags: { feature: 'social', operation: 'hydrate_following' },
        extras: { message: 'hydrateSocialFollowing failed' },
      });
    });

    it('logs errors from a deferred hydration after unlock', async () => {
      const { updateFollowing, unlock } = setupMessenger({ isUnlocked: false });
      const err = new Error('network error');
      updateFollowing.mockRejectedValueOnce(err);

      await hydrateSocialFollowing();
      unlock();
      await flushPromises();

      expect(Logger.error).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledWith(
        err,
        expect.objectContaining({
          tags: { feature: 'social', operation: 'hydrate_following' },
        }),
      );
    });

    it('logs and does not throw when KeyringController state is unavailable', async () => {
      const { messenger, updateFollowing, subscribeSpy } = setupMessenger({
        isUnlocked: false,
      });
      messenger.unregisterActionHandler('KeyringController:getState');

      await expect(hydrateSocialFollowing()).resolves.toBeUndefined();

      expect(updateFollowing).not.toHaveBeenCalled();
      expect(subscribeSpy).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
