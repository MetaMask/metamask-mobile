import { AppState } from 'react-native';
import { take, fork, cancel } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { UserActionType, checkForDeeplink } from '../../actions/user';
import Routes from '../../constants/navigation/Routes';
import {
  authStateMachine,
  appLockStateMachine,
  startAppServices,
  initializeSDKServices,
  handleDeeplinkSaga,
  handleSnapsRegistry,
  requestAuthOnAppStart,
  appStateListenerTask,
} from './';
import { NavigationActionType } from '../../actions/navigation';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import Engine from '../../core/Engine';
import SharedDeeplinkManager from '../../core/DeeplinkManager/DeeplinkManager';

import { setCompletedOnboarding } from '../../actions/onboarding';
import SDKConnect from '../../core/SDKConnect/SDKConnect';
import WC2Manager from '../../core/WalletConnect/WalletConnectV2';
import Authentication from '../../core/Authentication';
import { MetaMetrics } from '../../core/Analytics';
import Logger from '../../util/Logger';
import AppConstants from '../../core/AppConstants';
import trackErrorAsAnalytics from '../../util/metrics/TrackError/trackErrorAsAnalytics';

const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('../../core/NavigationService', () => ({
  navigation: {
    navigate: (screen: string, params?: unknown) => {
      params ? mockNavigate(screen, params) : mockNavigate(screen);
    },
    reset: (state: unknown) => mockReset(state),
  },
}));

// Mock the services
jest.mock('../../core/EngineService', () => ({
  start: jest.fn(),
}));

jest.mock('../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    start: jest.fn(),
    pendingDeeplink: null,
    pendingDeeplinkSource: null,
    clearPendingDeeplink: jest.fn(),
  },
}));

jest.mock('../../core/Analytics', () => ({
  __esModule: true,
  MetaMetrics: {
    getInstance: jest.fn().mockReturnValue({
      configure: jest.fn().mockResolvedValue(true),
    }),
  },
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

jest.mock('../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      init: jest.fn(),
    },
    AccountsController: {
      updateAccounts: jest.fn(),
    },
    RemoteFeatureFlagController: {
      state: {
        remoteFeatureFlags: {
          enableMultichainAccounts: {
            version: '1',
            enabled: true,
          },
        },
      },
    },
    KeyringController: {
      isUnlocked: jest.fn().mockReturnValue(false),
    },
    SnapController: {
      updateRegistry: jest.fn(),
    },
  },
}));

jest.mock('../../core/DeeplinkManager/DeeplinkManager', () => {
  const mockParse = jest.fn().mockResolvedValue(true);
  return {
    __esModule: true,
    default: {
      init: jest.fn(),
      start: jest.fn(),
      getInstance: jest.fn(() => ({ parse: mockParse })),
      parse: mockParse,
      setDeeplink: jest.fn(),
      getPendingDeeplink: jest.fn(),
      expireDeeplink: jest.fn(),
    },
  };
});

// (AppStateEventListener mock defined above)

jest.mock('../../core/SDKConnect/SDKConnect', () => ({
  __esModule: true,
  default: {
    init: jest.fn().mockResolvedValue(undefined),
    getInstance: jest.fn().mockReturnValue({
      postInit: jest.fn().mockResolvedValue(undefined),
      state: {
        _initialized: true,
        _postInitialized: true,
      },
    }),
  },
}));

jest.mock('../../core/WalletConnect/WalletConnectV2', () => ({
  __esModule: true,
  default: {
    init: jest.fn().mockResolvedValue(undefined),
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../../core/Authentication', () => ({
  __esModule: true,
  default: {
    unlockWallet: jest.fn().mockResolvedValue(undefined),
    lockApp: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../core/LockManagerService', () => ({
  __esModule: true,
  default: {
    startListening: jest.fn(),
    stopListening: jest.fn(),
  },
}));

// Add this mock with the other mocks (around line 151)
jest.mock('../../util/metrics/TrackError/trackErrorAsAnalytics', () =>
  jest.fn(),
);

const defaultMockState = {
  onboarding: { completedOnboarding: false },
  user: { existingUser: true },
  engine: { backgroundState: {} },
  confirmation: {},
  navigation: {},
  security: {},
  sdk: {},
  inpageProvider: {},
  confirmationMetrics: {},
  originThrottling: {},
  notifications: {},
  bridge: {},
  banners: {},
};

describe('requestAuthOnAppStart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Authentication.unlockWallet', async () => {
    await expectSaga(requestAuthOnAppStart).run();
    expect(Authentication.unlockWallet).toHaveBeenCalled();
  });

  it('navigates to Login when Authentication.unlockWallet throws', async () => {
    // Mock Authentication.unlockWallet to throw an error
    (Authentication.unlockWallet as jest.Mock).mockRejectedValueOnce(
      new Error('fail'),
    );
    await expectSaga(requestAuthOnAppStart).run();
    expect(mockReset).toHaveBeenCalledWith({
      routes: [{ name: Routes.ONBOARDING.LOGIN }],
    });
  });
});

describe('authStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockReset.mockClear();
  });

  it('forks appLockStateMachine when logged in', async () => {
    const generator = authStateMachine();
    expect(generator.next().value).toEqual(take(UserActionType.LOGIN));
    expect(generator.next().value).toEqual(fork(appLockStateMachine));
  });

  it('cancels appLockStateMachine when logged out', async () => {
    const generator = authStateMachine();
    // Logged in
    generator.next();
    // Fork appLockStateMachine
    generator.next();
    expect(generator.next().value).toEqual(take(UserActionType.LOGOUT));
    expect(generator.next().value).toEqual(cancel());
  });
});

// Add these tests (after the appLockStateMachine describe block)
describe('appStateListenerTask', () => {
  let appStateCallback: (state: string) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    // Capture the AppState callback when addEventListener is called
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_, callback) => {
        appStateCallback = callback;
        return { remove: jest.fn() };
      },
    );
  });

  it('creates event channel to listen to app state changes', async () => {
    await expectSaga(appStateListenerTask).silentRun(50);

    expect(AppState.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('calls unlockWallet when app becomes active', async () => {
    // Simulate app state change to 'active' after saga starts
    setTimeout(() => {
      appStateCallback('active');
    }, 10);

    await expectSaga(appStateListenerTask).silentRun(100);

    expect(Authentication.unlockWallet).toHaveBeenCalled();
  });

  it('does not call unlockWallet when app is in background', async () => {
    // Simulate app state change to 'background'
    setTimeout(() => {
      appStateCallback('background');
    }, 10);

    await expectSaga(appStateListenerTask).silentRun(100);

    expect(Authentication.unlockWallet).not.toHaveBeenCalled();
  });

  it('does not call unlockWallet when app is inactive', async () => {
    // Simulate app state change to 'inactive'
    setTimeout(() => {
      appStateCallback('inactive');
    }, 10);

    await expectSaga(appStateListenerTask).silentRun(100);

    expect(Authentication.unlockWallet).not.toHaveBeenCalled();
  });

  it('calls lockApp and tracks error when unlockWallet fails', async () => {
    const mockError = new Error('Authentication failed');
    (Authentication.unlockWallet as jest.Mock).mockRejectedValueOnce(mockError);

    // Simulate app becoming active
    setTimeout(() => {
      appStateCallback('active');
    }, 10);

    await expectSaga(appStateListenerTask).silentRun(100);

    expect(Authentication.unlockWallet).toHaveBeenCalled();
    expect(Authentication.lockApp).toHaveBeenCalledWith({ reset: false });
    expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
      'Lockscreen: Authentication failed',
      'Authentication failed',
    );
  });
});

describe('appLockStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockReset.mockClear();
  });

  it('forks appStateListenerTask and navigates to LockScreen when app is locked', async () => {
    await expectSaga(appLockStateMachine)
      .dispatch({ type: UserActionType.LOCKED_APP })
      // Verify appStateListenerTask is called
      .call(appStateListenerTask)
      .run();

    // Verify navigation to LockScreen
    expect(mockNavigate).toHaveBeenCalledWith(Routes.LOCK_SCREEN);
  });
});

// TODO: Update all saga tests to use expectSaga (more intuitive and easier to read)
describe('startAppServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts app services when gates open', async () => {
    await expectSaga(startAppServices)
      .withState({
        onboarding: { completedOnboarding: false },
        user: { existingUser: true },
      })
      // Dispatch both required actions
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .run();

    // Verify services are started
    expect(EngineService.start).toHaveBeenCalled();
    expect(AppStateEventProcessor.start).toHaveBeenCalled();
    expect(MetaMetrics.getInstance().configure).toHaveBeenCalled();
  });

  it('logs error when MetaMetrics.configure fails', async () => {
    MetaMetrics.getInstance().configure = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed to configure MetaMetrics'));

    await expectSaga(startAppServices)
      .withState({
        onboarding: { completedOnboarding: false },
        user: { existingUser: true },
      })
      // Dispatch both required actions
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .run();

    // Verify services are started
    expect(EngineService.start).toHaveBeenCalled();
    expect(AppStateEventProcessor.start).toHaveBeenCalled();
    expect(MetaMetrics.getInstance().configure).toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      new Error('Failed to configure MetaMetrics'),
      'Error configuring MetaMetrics',
    );
  });

  it('does not start app services if persisted data is not loaded', async () => {
    await expectSaga(startAppServices)
      // Dispatch both required actions
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .run();

    // Verify services are not started
    expect(EngineService.start).not.toHaveBeenCalled();
    expect(AppStateEventProcessor.start).not.toHaveBeenCalled();
    expect(WC2Manager.init).not.toHaveBeenCalled();
    expect(SDKConnect.init).not.toHaveBeenCalled();
    expect(MetaMetrics.getInstance().configure).not.toHaveBeenCalled();
  });

  it('requests authentication on app start', async () => {
    MetaMetrics.getInstance().configure = jest.fn().mockResolvedValueOnce(true);

    await expectSaga(startAppServices)
      .withState({
        onboarding: { completedOnboarding: false },
        user: { existingUser: true },
      })
      // Dispatch both required actions
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .run();

    // Verify authentication is requested
    expect(Authentication.unlockWallet).toHaveBeenCalled();
  });

  // The SDKConnect init gating is now bundled within startAppServices
});

describe('initializeSDKServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes WalletConnect V2 and SDKConnect', async () => {
    await expectSaga(initializeSDKServices).run();

    expect(WC2Manager.init).toHaveBeenCalledWith({});
    expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
  });

  it('still calls WalletConnect V2 if SDKConnect.init throws', async () => {
    (SDKConnect.init as jest.Mock).mockRejectedValueOnce(new Error('fail'));

    await expectSaga(initializeSDKServices).run();

    expect(WC2Manager.init).toHaveBeenCalledWith({});
    expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
  });
});

describe('handleDeeplinkSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('without deeplink', () => {
    it('should skip handling deeplink', async () => {
      // Triggered by CHECK_FOR_DEEPLINK action
      await expectSaga(handleDeeplinkSaga)
        .withState({
          onboarding: { completedOnboarding: false },
          user: { existingUser: true },
          engine: { backgroundState: {} },
          confirmation: {},
          navigation: {},
          security: {},
          sdk: {},
          inpageProvider: {},
          confirmationMetrics: {},
          originThrottling: {},
          notifications: {},
          bridge: {},
          banners: {},
        })
        .dispatch(checkForDeeplink())
        .silentRun();

      expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
      expect(
        AppStateEventProcessor.clearPendingDeeplink,
      ).not.toHaveBeenCalled();
      expect(WC2Manager.init).not.toHaveBeenCalled();
      expect(SDKConnect.init).not.toHaveBeenCalled();
    });
  });

  describe('with deeplink', () => {
    describe('when app is locked', () => {
      it('should skip handling deeplink', async () => {
        AppStateEventProcessor.pendingDeeplink = 'dummy-deeplink';

        // Triggered by CHECK_FOR_DEEPLINK action
        await expectSaga(handleDeeplinkSaga)
          .withState({
            onboarding: { completedOnboarding: false },
            user: { existingUser: true },
            engine: { backgroundState: {} },
            confirmation: {},
            navigation: {},
            security: {},
            sdk: {},
            inpageProvider: {},
            confirmationMetrics: {},
            originThrottling: {},
            notifications: {},
            bridge: {},
            banners: {},
          })
          .dispatch(checkForDeeplink())
          .silentRun();

        expect(Engine.context.KeyringController.isUnlocked).toHaveBeenCalled();
        expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
        expect(
          AppStateEventProcessor.clearPendingDeeplink,
        ).not.toHaveBeenCalled();
        expect(WC2Manager.init).not.toHaveBeenCalled();
        expect(SDKConnect.init).not.toHaveBeenCalled();
      });
    });
    describe('when app is unlocked', () => {
      describe('when completed onboarding is false', () => {
        it('should skip handling deeplink', async () => {
          AppStateEventProcessor.pendingDeeplink = 'dummy-deeplink';

          // Triggered by SET_COMPLETED_ONBOARDING action
          await expectSaga(handleDeeplinkSaga)
            .withState({
              user: { existingUser: true },
            })
            .dispatch(setCompletedOnboarding(false))
            .silentRun();

          expect(
            Engine.context.KeyringController.isUnlocked,
          ).toHaveBeenCalled();
          expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
          expect(
            AppStateEventProcessor.clearPendingDeeplink,
          ).not.toHaveBeenCalled();
          expect(WC2Manager.init).not.toHaveBeenCalled();
          expect(SDKConnect.init).not.toHaveBeenCalled();
        });
      });
      describe('when completed onboarding is passed in and true', () => {
        it('should parse deeplink', async () => {
          AppStateEventProcessor.pendingDeeplink = 'dummy-deeplink';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);

          // Triggered by SET_COMPLETED_ONBOARDING action
          await expectSaga(handleDeeplinkSaga)
            .withState({
              user: { existingUser: true },
            })
            .dispatch(setCompletedOnboarding(true))
            .silentRun();

          expect(
            Engine.context.KeyringController.isUnlocked,
          ).toHaveBeenCalled();
          expect(SharedDeeplinkManager.parse).toHaveBeenCalled();
          expect(
            AppStateEventProcessor.clearPendingDeeplink,
          ).toHaveBeenCalled();
          expect(WC2Manager.init).toHaveBeenCalledWith({});
          expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
        });
      });
      describe('when completed onboarding is true in Redux state', () => {
        it('should parse deeplink', async () => {
          AppStateEventProcessor.pendingDeeplink = 'dummy-deeplink';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);

          // Triggered by CHECK_FOR_DEEPLINK action
          await expectSaga(handleDeeplinkSaga)
            .withState({
              onboarding: { completedOnboarding: true },
              user: { existingUser: true },
              engine: { backgroundState: {} },
              confirmation: {},
              navigation: {},
              security: {},
              sdk: {},
              inpageProvider: {},
              confirmationMetrics: {},
              originThrottling: {},
              notifications: {},
              bridge: {},
              banners: {},
            })
            .dispatch(checkForDeeplink())
            .silentRun();

          expect(
            Engine.context.KeyringController.isUnlocked,
          ).toHaveBeenCalled();
          expect(SharedDeeplinkManager.parse).toHaveBeenCalled();
          expect(
            AppStateEventProcessor.clearPendingDeeplink,
          ).toHaveBeenCalled();
          expect(WC2Manager.init).toHaveBeenCalledWith({});
          expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
        });
      });
    });
    describe('onboarding deeplink', () => {
      describe('when existing user is true', () => {
        it('skip onboarding deeplink handling and continue to normal deeplink flow', async () => {
          AppStateEventProcessor.pendingDeeplink =
            'https://metamask.io/onboarding?type=google';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);

          // Triggered by CHECK_FOR_DEEPLINK action
          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
            })
            .dispatch(checkForDeeplink())
            .silentRun();

          expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
        });
      });

      describe('when existing user is false', () => {
        it('handle onboarding deeplink when completed onboarding is false', async () => {
          AppStateEventProcessor.pendingDeeplink =
            'https://metamask.io/onboarding?type=google';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);

          // Triggered by CHECK_FOR_DEEPLINK action
          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              user: { existingUser: false },
            })
            .dispatch(checkForDeeplink())
            .silentRun();

          expect(SharedDeeplinkManager.parse).toHaveBeenCalled();
        });

        it('not handle onboarding deeplink when pathname is not /onboarding', async () => {
          AppStateEventProcessor.pendingDeeplink =
            'https://metamask.io/invalidonboarding?type=google';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);

          // Triggered by CHECK_FOR_DEEPLINK action
          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              user: { existingUser: false },
            })
            .dispatch(checkForDeeplink())
            .silentRun();

          expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
        });
      });
    });

    describe('source tracking', () => {
      it('passes pendingDeeplinkSource to parse when set', async () => {
        const testLink = 'https://link.metamask.io/home';
        AppStateEventProcessor.pendingDeeplink = testLink;
        AppStateEventProcessor.pendingDeeplinkSource =
          AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION;
        Engine.context.KeyringController.isUnlocked = jest
          .fn()
          .mockReturnValue(true);

        await expectSaga(handleDeeplinkSaga)
          .withState({
            ...defaultMockState,
            onboarding: { completedOnboarding: true },
          })
          .dispatch(checkForDeeplink())
          .silentRun();

        expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(
          testLink,
          expect.objectContaining({
            origin: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
          }),
        );
      });

      it('defaults to ORIGIN_DEEPLINK when pendingDeeplinkSource is null', async () => {
        const testLink = 'https://link.metamask.io/home';
        AppStateEventProcessor.pendingDeeplink = testLink;
        AppStateEventProcessor.pendingDeeplinkSource = null;
        Engine.context.KeyringController.isUnlocked = jest
          .fn()
          .mockReturnValue(true);

        await expectSaga(handleDeeplinkSaga)
          .withState({
            ...defaultMockState,
            onboarding: { completedOnboarding: true },
          })
          .dispatch(checkForDeeplink())
          .silentRun();

        expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(
          testLink,
          expect.objectContaining({
            origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
          }),
        );
      });
    });
  });
});

describe('handleSnapsRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('triggers on login', async () => {
    await expectSaga(handleSnapsRegistry)
      .withState({ onboarding: { completedOnboarding: true } })
      .dispatch({ type: UserActionType.LOGIN })
      .silentRun();

    expect(Engine.context.SnapController.updateRegistry).toHaveBeenCalled();
  });

  it('triggers when onboarding has finished', async () => {
    await expectSaga(handleSnapsRegistry)
      .withState({ onboarding: { completedOnboarding: false } })
      .dispatch(setCompletedOnboarding(true))
      .silentRun();

    expect(Engine.context.SnapController.updateRegistry).toHaveBeenCalled();
  });

  it('does not trigger if onboarding has not been completed', async () => {
    await expectSaga(handleSnapsRegistry)
      .withState({ onboarding: { completedOnboarding: false } })
      .dispatch({ type: UserActionType.LOGIN })
      .silentRun();

    expect(Engine.context.SnapController.updateRegistry).not.toHaveBeenCalled();
  });

  it('does not trigger when onboarding is reset', async () => {
    await expectSaga(handleSnapsRegistry)
      .withState({ onboarding: { completedOnboarding: false } })
      .dispatch(setCompletedOnboarding(false))
      .silentRun();

    expect(Engine.context.SnapController.updateRegistry).not.toHaveBeenCalled();
  });
});
