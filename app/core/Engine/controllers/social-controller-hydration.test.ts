import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import Logger from '../../../util/Logger';
import { hydrateSocialFollowing } from './social-controller-hydration';

type TestActions =
  | {
      type: 'KeyringController:getState';
      handler: () => { isUnlocked: boolean };
    }
  | {
      type: 'AuthenticationController:isSignedIn';
      handler: () => boolean;
    }
  | {
      type: 'SocialController:updateFollowing';
      handler: () => Promise<{ following: unknown[] }>;
    };

interface TestEvents {
  type: 'KeyringController:unlock';
  payload: [];
}

type TestMessenger = Messenger<string, TestActions, TestEvents>;

let mockMessenger: TestMessenger | undefined;

jest.mock('../../Engine', () => ({
  get controllerMessenger() {
    return mockMessenger;
  },
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const EXPECTED_LOG_OPTIONS = {
  tags: { feature: 'social', operation: 'hydrate_following' },
  extras: { message: 'hydrateSocialFollowing failed' },
};

/**
 * Builds a real messenger with the actions hydration depends on and installs
 * it as `Engine.controllerMessenger`.
 */
const setupMessenger = ({
  isUnlocked,
  isSignedIn,
}: {
  isUnlocked: boolean;
  isSignedIn: boolean;
}) => {
  const messenger: TestMessenger = new Messenger<
    string,
    TestActions,
    TestEvents
  >({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const getKeyringState = jest.fn(() => ({ isUnlocked }));
  const getIsSignedIn = jest.fn(() => isSignedIn);
  const updateFollowing = jest.fn(
    async (): Promise<{ following: unknown[] }> => ({ following: [] }),
  );

  messenger.registerActionHandler(
    'KeyringController:getState',
    getKeyringState,
  );
  messenger.registerActionHandler(
    'AuthenticationController:isSignedIn',
    getIsSignedIn,
  );
  messenger.registerActionHandler(
    'SocialController:updateFollowing',
    updateFollowing,
  );

  const subscribeSpy = jest.spyOn(messenger, 'subscribe');

  mockMessenger = messenger;

  return {
    getKeyringState,
    getIsSignedIn,
    updateFollowing,
    subscribeSpy,
  };
};

describe('hydrateSocialFollowing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the wallet is locked at startup', () => {
    it('skips updateFollowing', async () => {
      const { updateFollowing } = setupMessenger({
        isUnlocked: false,
        isSignedIn: true,
      });

      await hydrateSocialFollowing();

      expect(updateFollowing).not.toHaveBeenCalled();
    });

    it('does not check the sign-in state', async () => {
      const { getIsSignedIn } = setupMessenger({
        isUnlocked: false,
        isSignedIn: true,
      });

      await hydrateSocialFollowing();

      expect(getIsSignedIn).not.toHaveBeenCalled();
    });

    it('does not log an error', async () => {
      setupMessenger({ isUnlocked: false, isSignedIn: true });

      await hydrateSocialFollowing();

      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('does not subscribe to any messenger event', async () => {
      const { subscribeSpy } = setupMessenger({
        isUnlocked: false,
        isSignedIn: true,
      });

      await hydrateSocialFollowing();

      expect(subscribeSpy).not.toHaveBeenCalled();
    });
  });

  describe('when the wallet is unlocked and signed in at startup', () => {
    it('calls updateFollowing once without arguments', async () => {
      const { updateFollowing } = setupMessenger({
        isUnlocked: true,
        isSignedIn: true,
      });

      await hydrateSocialFollowing();

      expect(updateFollowing).toHaveBeenCalledTimes(1);
      expect(updateFollowing).toHaveBeenCalledWith();
    });

    it('does not log an error when updateFollowing resolves', async () => {
      setupMessenger({ isUnlocked: true, isSignedIn: true });

      await hydrateSocialFollowing();

      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('does not subscribe to any messenger event', async () => {
      const { subscribeSpy } = setupMessenger({
        isUnlocked: true,
        isSignedIn: true,
      });

      await hydrateSocialFollowing();

      expect(subscribeSpy).not.toHaveBeenCalled();
    });
  });

  describe('when the wallet is unlocked but not signed in at startup', () => {
    it('skips updateFollowing', async () => {
      const { updateFollowing } = setupMessenger({
        isUnlocked: true,
        isSignedIn: false,
      });

      await hydrateSocialFollowing();

      expect(updateFollowing).not.toHaveBeenCalled();
    });

    it('does not log an error', async () => {
      setupMessenger({ isUnlocked: true, isSignedIn: false });

      await hydrateSocialFollowing();

      expect(Logger.error).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('logs an updateFollowing rejection with social tags and resolves', async () => {
      const { updateFollowing } = setupMessenger({
        isUnlocked: true,
        isSignedIn: true,
      });
      const error = new Error('network error');
      updateFollowing.mockRejectedValueOnce(error);

      const result = hydrateSocialFollowing();

      await expect(result).resolves.toBeUndefined();
      expect(Logger.error).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledWith(error, EXPECTED_LOG_OPTIONS);
    });

    it('logs a KeyringController:getState error with social tags and resolves', async () => {
      const { getKeyringState, updateFollowing } = setupMessenger({
        isUnlocked: true,
        isSignedIn: true,
      });
      const error = new Error('keyring state unavailable');
      getKeyringState.mockImplementationOnce(() => {
        throw error;
      });

      const result = hydrateSocialFollowing();

      await expect(result).resolves.toBeUndefined();
      expect(updateFollowing).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledWith(error, EXPECTED_LOG_OPTIONS);
    });

    it('logs an AuthenticationController:isSignedIn error with social tags and resolves', async () => {
      const { getIsSignedIn, updateFollowing } = setupMessenger({
        isUnlocked: true,
        isSignedIn: true,
      });
      const error = new Error('authentication state unavailable');
      getIsSignedIn.mockImplementationOnce(() => {
        throw error;
      });

      const result = hydrateSocialFollowing();

      await expect(result).resolves.toBeUndefined();
      expect(updateFollowing).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledWith(error, EXPECTED_LOG_OPTIONS);
    });
  });
});
