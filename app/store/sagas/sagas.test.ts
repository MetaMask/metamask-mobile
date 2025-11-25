import { expectSaga } from 'redux-saga-test-plan';
import { UserActionType, checkForDeeplink } from '../../actions/user';
import {
  startAppServices,
  initializeSDKServices,
  handleDeeplinkSaga,
  handleSnapsRegistry,
} from './';
import { NavigationActionType } from '../../actions/navigation';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import SharedDeeplinkManager from '../../core/DeeplinkManager/SharedDeeplinkManager';
import Engine from '../../core/Engine';
import DeeplinkManager from '../../core/DeeplinkManager/DeeplinkManager';
import branch from 'react-native-branch';
import { handleDeeplink } from '../../core/DeeplinkManager/Handlers/handleDeeplink';
import { setCompletedOnboarding } from '../../actions/onboarding';
import SDKConnect from '../../core/SDKConnect/SDKConnect';
import WC2Manager from '../../core/WalletConnect/WalletConnectV2';

const mockNavigate = jest.fn();

jest.mock('../../util/notifications/services/FCMService', () => ({
  __esModule: true,
  default: {
    onClickPushNotificationWhenAppClosed: jest.fn().mockResolvedValue(null),
    onClickPushNotificationWhenAppSuspended: jest.fn(),
  },
}));

jest.mock('../../core/NavigationService', () => ({
  navigation: {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate: (screen: any, params?: any) => {
      params ? mockNavigate(screen, params) : mockNavigate(screen);
    },
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
    clearPendingDeeplink: jest.fn(),
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

jest.mock('../../core/DeeplinkManager/SharedDeeplinkManager', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    parse: jest.fn(),
  },
}));

// Use real DeeplinkManager to verify Branch/linking behavior triggered by startAppServices

// Branch and Linking mocks for DeeplinkManager.start tests
jest.mock('react-native-branch', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(),
    getLatestReferringParams: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getInitialURL: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../core/DeeplinkManager/Handlers/handleDeeplink', () => ({
  handleDeeplink: jest.fn(),
}));

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

// NOTE: Old authentication sagas (authStateMachine, appLockStateMachine, biometricsStateMachine, lockKeyringAndApp)
// have been removed and replaced by the new authenticationSaga in app/core/redux/slices/authentication/sagas.ts
// These tests are kept for reference but are no longer functional.
// TODO: Add tests for the new authentication saga system

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
  });

  it('skips starting app services when navigation is not ready', async () => {
    await expectSaga(startAppServices)
      // Dispatch both required actions
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .run();

    // Verify services are not started
    expect(EngineService.start).not.toHaveBeenCalled();
    expect(AppStateEventProcessor.start).not.toHaveBeenCalled();
    expect(WC2Manager.init).not.toHaveBeenCalled();
    expect(SDKConnect.init).not.toHaveBeenCalled();
  });

  it('skips starting app services when persisted data is not loaded', async () => {
    await expectSaga(startAppServices)
      // Dispatch both required actions
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .run();

    // Verify services are not started
    expect(EngineService.start).not.toHaveBeenCalled();
    expect(AppStateEventProcessor.start).not.toHaveBeenCalled();
    expect(WC2Manager.init).not.toHaveBeenCalled();
    expect(SDKConnect.init).not.toHaveBeenCalled();
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
        it('skips handling deeplink when onboarding is incomplete', async () => {
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
        it('parses deeplink when onboarding is complete', async () => {
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
        it('parses deeplink when onboarding is complete', async () => {
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
        it('skips onboarding deeplink handling when existing user is true', async () => {
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
        it('handles onboarding deeplink when existing user is false', async () => {
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

        it('skips onboarding deeplink when pathname is not /onboarding', async () => {
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
  });
});

describe('DeeplinkManager.start Branch deeplink handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes SharedDeeplinkManager', async () => {
    DeeplinkManager.start();
    expect(SharedDeeplinkManager.init).toHaveBeenCalled();
  });

  it('calls getLatestReferringParams immediately for cold start deeplink check', async () => {
    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});
    DeeplinkManager.start();
    await new Promise((resolve) => setImmediate(resolve));
    expect(branch.getLatestReferringParams).toHaveBeenCalledTimes(1);
  });

  it('processes cold start deeplink when non-branch link is found', async () => {
    const mockDeeplink = 'https://link.metamask.io/home';
    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({
      '+non_branch_link': mockDeeplink,
    });
    DeeplinkManager.start();
    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).toHaveBeenCalledWith({ uri: mockDeeplink });
  });

  it('subscribes to Branch deeplink events', async () => {
    DeeplinkManager.start();
    expect(branch.subscribe).toHaveBeenCalled();
  });

  it('processes deeplink from subscription callback when uri is provided', async () => {
    DeeplinkManager.start();
    expect(branch.subscribe).toHaveBeenCalledWith(expect.any(Function));
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];
    const mockUri = 'https://link.metamask.io/home';
    callback({ uri: mockUri });
    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).toHaveBeenCalledWith({ uri: mockUri });
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
