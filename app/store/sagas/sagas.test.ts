import { runSaga, type Task } from 'redux-saga';
import { call, cancel, delay, fork, take } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import {
  UserActionType,
  checkForDeeplink,
  setAppServicesReady,
} from '../../actions/user';
import Routes from '../../constants/navigation/Routes';
import {
  authStateMachine,
  startAppServices,
  initializeSDKServices,
  initializeSDKServicesSaga,
  handleDeeplinkSaga,
  handleSnapsRegistry,
  parseDeeplink,
  parseDeeplinkAfterNavReady,
  parseDeeplinkAfterOnboarding,
  parseReferralDeeplink,
  mainNavigatorReadyStateMachine,
  __setMainNavigatorReadyForTesting,
  __resetDeeplinkOpenedBeforeWalletForTesting,
  __resetReferralLinkParseForTesting,
  __resetSDKServicesInitializationForTesting,
  requestAuthOnAppStart,
} from './';
import {
  NavigationActionType,
  mainNavigatorReady,
} from '../../actions/navigation';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import {
  markNextParseAsUnlockSession,
  resetNextParseAppStartTypeForTesting,
} from '../../core/DeeplinkManager/utils/startupDeeplinkNavigation';
import { resetUnlockAppStartTypeForTesting } from '../../core/Performance/unlockTraces';
import { resetLoginAppStartTypeForTesting } from '../../components/Views/Login/loginPerformanceTags';
import {
  markStartup,
  timeStartupStep,
} from '../../core/Performance/startupStageSpans';
import Engine from '../../core/Engine';
import AppLockService from '../../core/AppLock/AppLockService';
import SharedDeeplinkManager from '../../core/DeeplinkManager/DeeplinkManager';

import {
  CLEAR_ONBOARDING,
  setCompletedOnboarding,
} from '../../actions/onboarding';
import SDKConnect from '../../core/SDKConnect/SDKConnect';
import WC2Manager from '../../core/WalletConnect/WalletConnectV2';
import Authentication from '../../core/Authentication';
import AppConstants from '../../core/AppConstants';
import { getDevAutoUnlockPassword } from '../../util/environment';
import { saveAttribution } from '../../core/redux/slices/attribution';
import {
  setPendingReferralCode,
  setReferralLinkPending,
} from '../../reducers/rewardsMoney';
import { hydrateSocialTermsAcceptance } from '../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance';
jest.mock('../../util/analytics/persistAttributionFromPendingDeeplink', () => ({
  getUtmAttributesFromDeeplinkUrl: jest.fn(),
  persistUtmAttributes: jest.fn(),
  persistAttributionFromPendingDeeplink: jest.fn(),
}));

import { getUtmAttributesFromDeeplinkUrl } from '../../util/analytics/persistAttributionFromPendingDeeplink';

const mockGetUtmAttributesFromDeeplinkUrl = jest.mocked(
  getUtmAttributesFromDeeplinkUrl,
);

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockGetCurrentRoute = jest.fn();

jest.mock('../../core/NavigationService', () => ({
  getCurrentRoute: () => mockGetCurrentRoute(),
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

jest.mock(
  '../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance',
  () => ({
    hydrateSocialTermsAcceptance: jest.fn(() => Promise.resolve()),
  }),
);

jest.mock('../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    start: jest.fn(),
    pendingDeeplink: null,
    pendingDeeplinkSource: null,
    clearPendingDeeplink: jest.fn(),
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
    ApprovalController: {
      clearRequests: jest.fn(),
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
      state: {
        vault: undefined,
        keyrings: [],
        isUnlocked: false,
      },
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
    tryBiometricUnlock: jest.fn().mockResolvedValue(undefined),
    lockApp: jest.fn().mockResolvedValue(undefined),
    checkIsSeedlessPasswordOutdated: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../../util/environment', () => ({
  getDevAutoUnlockPassword: jest.fn(),
}));

jest.mock('../../core/AppLock/AppLockService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    isAutoLockPending: jest.fn(() => false),
  },
}));

const mockStopStartupStep = jest.fn();
jest.mock('../../core/Performance/startupStageSpans', () => ({
  markStartup: jest.fn(),
  timeStartupStep: jest.fn(() => mockStopStartupStep),
}));

const defaultMockState = {
  onboarding: {
    completedOnboarding: false,
    pendingSocialLoginMarketingConsentBackfill: null,
  },
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

beforeEach(() => {
  (getDevAutoUnlockPassword as jest.Mock).mockReturnValue(undefined);
  (Engine.context.KeyringController.isUnlocked as jest.Mock).mockReturnValue(
    false,
  );
  Engine.context.KeyringController.state = {
    vault: undefined,
    keyrings: [],
    isUnlocked: false,
  };
});

describe('requestAuthOnAppStart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Authentication.tryBiometricUnlock', async () => {
    await expectSaga(requestAuthOnAppStart).run();
    expect(Authentication.tryBiometricUnlock).toHaveBeenCalled();
  });

  it('navigates to Login when Authentication.tryBiometricUnlock throws', async () => {
    (Authentication.tryBiometricUnlock as jest.Mock).mockRejectedValueOnce(
      new Error('fail'),
    );
    await expectSaga(requestAuthOnAppStart).run();
    expect(mockReset).toHaveBeenCalledWith({
      routes: [{ name: Routes.ONBOARDING.LOGIN }],
    });
  });

  it('uses dev auto-unlock password in dev when the wallet has a vault and is locked', async () => {
    (getDevAutoUnlockPassword as jest.Mock).mockReturnValue('test-password');
    Engine.context.KeyringController.state = {
      vault: 'mock-vault',
      keyrings: [],
      isUnlocked: false,
    };

    await expectSaga(requestAuthOnAppStart).run();

    expect(Authentication.unlockWallet).toHaveBeenCalledWith({
      password: 'test-password',
    });
    expect(Authentication.tryBiometricUnlock).not.toHaveBeenCalled();
  });

  it('falls back to normal app-start authentication when dev auto-unlock is not configured', async () => {
    Engine.context.KeyringController.state = {
      vault: 'mock-vault',
      keyrings: [],
      isUnlocked: false,
    };

    await expectSaga(requestAuthOnAppStart).run();

    expect(Authentication.tryBiometricUnlock).toHaveBeenCalled();
    expect(Authentication.unlockWallet).not.toHaveBeenCalled();
  });

  it('falls back to normal app-start authentication when no vault exists', async () => {
    (getDevAutoUnlockPassword as jest.Mock).mockReturnValue('test-password');

    await expectSaga(requestAuthOnAppStart).run();

    expect(Authentication.tryBiometricUnlock).toHaveBeenCalled();
    expect(Authentication.unlockWallet).not.toHaveBeenCalled();
  });
});

describe('authStateMachine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('waits for login before starting AppLockService', () => {
    const generator = authStateMachine();

    expect(generator.next().value).toEqual(take(UserActionType.LOGIN));
    expect(AppLockService.start).not.toHaveBeenCalled();
  });

  it('starts AppLockService when logged in and waits for logout', () => {
    const generator = authStateMachine();
    generator.next();

    expect(generator.next().value).toEqual(take(UserActionType.LOGOUT));
    expect(AppLockService.start).toHaveBeenCalledTimes(1);
    expect(AppLockService.stop).not.toHaveBeenCalled();
  });

  it('stops AppLockService when logged out and waits for the next login', () => {
    const generator = authStateMachine();
    generator.next();
    generator.next();

    expect(generator.next().value).toEqual(take(UserActionType.LOGIN));
    expect(AppLockService.stop).toHaveBeenCalledTimes(1);
  });
});

// TODO: Update all saga tests to use expectSaga (more intuitive and easier to read)
describe('startAppServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSDKServicesInitializationForTesting();
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

    // Verify startup services are started without locked keychain-dependent work.
    expect(EngineService.start).toHaveBeenCalled();
    expect(AppStateEventProcessor.start).toHaveBeenCalled();
    expect(hydrateSocialTermsAcceptance).toHaveBeenCalled();
    expect(WC2Manager.init).not.toHaveBeenCalled();
    expect(SDKConnect.init).not.toHaveBeenCalled();
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
  });

  it('requests authentication on app start', async () => {
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
    expect(Authentication.tryBiometricUnlock).toHaveBeenCalled();
  });

  it('marks services ready for the startup recorder and times the service starts', async () => {
    await expectSaga(startAppServices)
      .withState({
        onboarding: { completedOnboarding: false },
        user: { existingUser: true },
      })
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .put(setAppServicesReady())
      .run();

    expect(markStartup).toHaveBeenCalledWith('servicesReady');
    expect(jest.mocked(timeStartupStep).mock.calls).toEqual([
      ['post_init_gap', 'startup.post_init.deeplink_manager_ms'],
      ['post_init_gap', 'startup.post_init.app_state_processor_ms'],
    ]);
    expect(mockStopStartupStep).toHaveBeenCalledTimes(2);
  });

  // SDKConnect/WC2 initialization starts from the unlocked deeplink saga path.
});

describe('initializeSDKServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSDKServicesInitializationForTesting();
  });

  it('initializes WalletConnect V2 and SDKConnect', async () => {
    await expectSaga(initializeSDKServices).run();

    expect(WC2Manager.init).toHaveBeenCalledWith({});
    expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
  });

  it('waits for WalletConnect V2 to finish if SDKConnect.init throws', async () => {
    let resolveWC2Init: () => void = () => undefined;
    (WC2Manager.init as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveWC2Init = resolve;
        }),
    );
    (SDKConnect.init as jest.Mock).mockRejectedValueOnce(new Error('fail'));

    let isInitializationDone = false;
    const sagaPromise = expectSaga(initializeSDKServices)
      .run()
      .then(() => {
        isInitializationDone = true;
      });

    await Promise.resolve();
    expect(isInitializationDone).toBe(false);

    resolveWC2Init();
    await sagaPromise;

    expect(WC2Manager.init).toHaveBeenCalledWith({});
    expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
  });

  it('waits for SDKConnect to finish if WalletConnect V2 init throws', async () => {
    (WC2Manager.init as jest.Mock).mockRejectedValueOnce(new Error('fail'));

    let resolveSDKConnectInit: () => void = () => undefined;
    (SDKConnect.init as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSDKConnectInit = resolve;
        }),
    );

    let isInitializationDone = false;
    const sagaPromise = expectSaga(initializeSDKServices)
      .run()
      .then(() => {
        isInitializationDone = true;
      });

    await Promise.resolve();
    expect(isInitializationDone).toBe(false);

    resolveSDKConnectInit();
    await sagaPromise;

    expect(WC2Manager.init).toHaveBeenCalledWith({});
    expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
  });
});

describe('initializeSDKServicesSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSDKServicesInitializationForTesting();
    AppStateEventProcessor.pendingDeeplink = null;
    AppStateEventProcessor.pendingDeeplinkSource = null;
  });

  it('starts SDK services on login for an unlocked onboarded user without a pending deeplink', async () => {
    Engine.context.KeyringController.isUnlocked = jest
      .fn()
      .mockReturnValue(true);

    await expectSaga(initializeSDKServicesSaga)
      .withState({
        ...defaultMockState,
        onboarding: { completedOnboarding: true },
      })
      .dispatch({ type: UserActionType.LOGIN })
      .silentRun();

    expect(WC2Manager.init).toHaveBeenCalledWith({});
    expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
    expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
    expect(AppStateEventProcessor.clearPendingDeeplink).not.toHaveBeenCalled();
  });

  it('does not start SDK services on login before onboarding is complete', async () => {
    Engine.context.KeyringController.isUnlocked = jest
      .fn()
      .mockReturnValue(true);

    await expectSaga(initializeSDKServicesSaga)
      .withState({
        ...defaultMockState,
        onboarding: { completedOnboarding: false },
      })
      .dispatch({ type: UserActionType.LOGIN })
      .silentRun();

    expect(WC2Manager.init).not.toHaveBeenCalled();
    expect(SDKConnect.init).not.toHaveBeenCalled();
  });

  it('starts SDK services when onboarding is completed after unlock', async () => {
    Engine.context.KeyringController.isUnlocked = jest
      .fn()
      .mockReturnValue(true);

    await expectSaga(initializeSDKServicesSaga)
      .withState(defaultMockState)
      .dispatch(setCompletedOnboarding(true))
      .silentRun();

    expect(WC2Manager.init).toHaveBeenCalledWith({});
    expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
  });

  it('does not start SDK services when the wallet is still locked', async () => {
    await expectSaga(initializeSDKServicesSaga)
      .withState({
        ...defaultMockState,
        onboarding: { completedOnboarding: true },
      })
      .dispatch({ type: UserActionType.LOGIN })
      .silentRun();

    expect(WC2Manager.init).not.toHaveBeenCalled();
    expect(SDKConnect.init).not.toHaveBeenCalled();
  });
});

describe('handleDeeplinkSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMainNavigatorReadyForTesting(true);
    __resetDeeplinkOpenedBeforeWalletForTesting();
    __resetReferralLinkParseForTesting();
    __resetSDKServicesInitializationForTesting();
    resetNextParseAppStartTypeForTesting();
    resetUnlockAppStartTypeForTesting();
    resetLoginAppStartTypeForTesting();
    AppStateEventProcessor.pendingDeeplink = null;
    AppStateEventProcessor.pendingDeeplinkSource = null;
    mockGetUtmAttributesFromDeeplinkUrl.mockReturnValue(null);
    mockGetCurrentRoute.mockReturnValue(undefined);
    (AppLockService.isAutoLockPending as jest.Mock).mockReturnValue(false);
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

    it('does not warm SDK services without a pending deeplink', async () => {
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

      expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
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
              navigation: {},
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
          expect(WC2Manager.init).not.toHaveBeenCalled();
          expect(SDKConnect.init).not.toHaveBeenCalled();
        });

        it.each([Routes.ONBOARDING.LOGIN])(
          'leaves a pending deeplink in place when onboarding completes on %s',
          async (routeName) => {
            AppStateEventProcessor.pendingDeeplink =
              'https://link.metamask.io/swap';
            Engine.context.KeyringController.isUnlocked = jest
              .fn()
              .mockReturnValue(true);
            mockGetCurrentRoute.mockReturnValue({ name: routeName });

            await expectSaga(handleDeeplinkSaga)
              .withState({
                user: { existingUser: true },
              })
              .dispatch(setCompletedOnboarding(true))
              .silentRun();

            expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
            expect(
              AppStateEventProcessor.clearPendingDeeplink,
            ).not.toHaveBeenCalled();
          },
        );

        it('leaves a pending deeplink in place while resume unlock is in progress', async () => {
          AppStateEventProcessor.pendingDeeplink =
            'https://link.metamask.io/swap';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);
          (AppLockService.isAutoLockPending as jest.Mock).mockReturnValue(true);

          await expectSaga(handleDeeplinkSaga)
            .withState({
              onboarding: { completedOnboarding: true },
              user: { existingUser: true },
            })
            .dispatch(setCompletedOnboarding(true))
            .silentRun();

          expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
          expect(
            AppStateEventProcessor.clearPendingDeeplink,
          ).not.toHaveBeenCalled();
        });

        it('leaves a pending deeplink in place while auto-lock is still pending', async () => {
          AppStateEventProcessor.pendingDeeplink =
            'https://link.metamask.io/privacy';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);
          (AppLockService.isAutoLockPending as jest.Mock).mockReturnValue(true);

          await expectSaga(handleDeeplinkSaga)
            .withState({
              onboarding: { completedOnboarding: true },
              user: { existingUser: true },
            })
            .dispatch(checkForDeeplink())
            .silentRun();

          expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
          expect(
            AppStateEventProcessor.clearPendingDeeplink,
          ).not.toHaveBeenCalled();
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
          expect(WC2Manager.init).not.toHaveBeenCalled();
          expect(SDKConnect.init).not.toHaveBeenCalled();
        });

        it('marks a link carrying a referral code as pending while it is parsed', async () => {
          AppStateEventProcessor.pendingDeeplink =
            'https://link.metamask.io/swap?ref=WEYRTZ';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);

          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              onboarding: { completedOnboarding: true },
            })
            .put(setReferralLinkPending(true))
            .fork.fn(parseReferralDeeplink)
            .put(setReferralLinkPending(false))
            .dispatch(checkForDeeplink())
            .silentRun();

          expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(
            'https://link.metamask.io/swap?ref=WEYRTZ',
            expect.objectContaining({
              origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
            }),
          );
        });

        it('does not mark a link without a referral code as pending', async () => {
          AppStateEventProcessor.pendingDeeplink =
            'https://link.metamask.io/swap?ref=a';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);

          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              onboarding: { completedOnboarding: true },
            })
            .not.put.actionType(setReferralLinkPending.type)
            .fork.fn(parseDeeplinkAfterNavReady)
            .dispatch(checkForDeeplink())
            .silentRun();
        });

        it('parses non-SDK deeplinks without starting SDK services', async () => {
          const rewardsLink = 'https://link.metamask.io/rewards';
          AppStateEventProcessor.pendingDeeplink = rewardsLink;
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

          expect(WC2Manager.init).not.toHaveBeenCalled();
          expect(SDKConnect.init).not.toHaveBeenCalled();
          expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(
            rewardsLink,
            expect.objectContaining({
              origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
            }),
          );
        });

        it('waits for SDK services before parsing SDK/WalletConnect deeplinks', async () => {
          AppStateEventProcessor.pendingDeeplink =
            'https://link.metamask.io/connect?channelId=test-channel-id';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);

          let resolveSDKConnectInit: () => void = () => undefined;
          (SDKConnect.init as jest.Mock).mockImplementationOnce(
            () =>
              new Promise<void>((resolve) => {
                resolveSDKConnectInit = resolve;
              }),
          );

          const sagaPromise = expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              onboarding: { completedOnboarding: true },
            })
            .dispatch(checkForDeeplink())
            .silentRun(100);

          await Promise.resolve();
          expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();

          resolveSDKConnectInit();
          await sagaPromise;

          expect(WC2Manager.init).toHaveBeenCalledWith({});
          expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
          expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(
            'https://link.metamask.io/connect?channelId=test-channel-id',
            expect.objectContaining({
              origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
            }),
          );
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
          expect(mockGetUtmAttributesFromDeeplinkUrl).not.toHaveBeenCalled();
        });
      });

      describe('when existing user is false', () => {
        it('persists UTM attributes from pending deeplink before onboarding handling', async () => {
          const onboardingLink =
            'https://metamask.io/onboarding?utm_source=e2e&utm_campaign=test';
          const payload = { utm_source: 'e2e', utm_campaign: 'test' };
          AppStateEventProcessor.pendingDeeplink = onboardingLink;
          mockGetUtmAttributesFromDeeplinkUrl.mockReturnValue(payload);

          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              user: { existingUser: false },
            })
            .put(saveAttribution(payload))
            .dispatch(checkForDeeplink())
            .silentRun();

          expect(mockGetUtmAttributesFromDeeplinkUrl).toHaveBeenCalledWith(
            onboardingLink,
          );
        });

        it('holds a link opened before the wallet until onboarding hands over to MainNavigator', async () => {
          AppStateEventProcessor.pendingDeeplink =
            'https://link.metamask.io/swap';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);
          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              user: { existingUser: false },
            })
            .dispatch(checkForDeeplink())
            .silentRun();

          // Wallet creation: the user exists and onboarding is marked complete.
          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              user: { existingUser: true },
            })
            .fork.fn(parseDeeplinkAfterOnboarding)
            .not.fork.fn(parseDeeplinkAfterNavReady)
            .dispatch(setCompletedOnboarding(true))
            .silentRun();
        });

        it('does not hold an SDK connection link opened before the wallet', async () => {
          const connectLink =
            'https://link.metamask.io/connect?channelId=test-channel-id';
          AppStateEventProcessor.pendingDeeplink = connectLink;
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);
          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              user: { existingUser: false },
            })
            .dispatch(checkForDeeplink())
            .silentRun();

          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              user: { existingUser: true },
            })
            .fork.fn(parseDeeplinkAfterNavReady)
            .not.fork.fn(parseDeeplinkAfterOnboarding)
            .dispatch(setCompletedOnboarding(true))
            .silentRun();
        });

        it('keeps the ready timeout for a link opened once the wallet exists', async () => {
          AppStateEventProcessor.pendingDeeplink =
            'https://link.metamask.io/swap?ref=WEYRTZ';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);
          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              user: { existingUser: false },
            })
            .dispatch(checkForDeeplink())
            .silentRun();
          AppStateEventProcessor.pendingDeeplink =
            'https://link.metamask.io/buy';

          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              user: { existingUser: true },
            })
            .fork.fn(parseDeeplinkAfterNavReady)
            .not.fork.fn(parseDeeplinkAfterOnboarding)
            .dispatch(setCompletedOnboarding(true))
            .silentRun();
        });

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

        it('does not wait for MainNavigator readiness before handling onboarding deeplinks', async () => {
          const onboardingLink = 'https://metamask.io/onboarding?type=google';
          AppStateEventProcessor.pendingDeeplink = onboardingLink;

          await expectSaga(handleDeeplinkSaga)
            .withState({
              ...defaultMockState,
              user: { existingUser: false },
              navigation: {},
            })
            .dispatch(checkForDeeplink())
            .silentRun();

          expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(
            onboardingLink,
            expect.objectContaining({
              origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
            }),
          );
          expect(
            Engine.context.KeyringController.isUnlocked,
          ).not.toHaveBeenCalled();
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

      it('passes the unlock-session appStartType when the leftover parse flag is set', async () => {
        const testLink = 'https://link.metamask.io/buy';
        AppStateEventProcessor.pendingDeeplink = testLink;
        AppStateEventProcessor.pendingDeeplinkSource = null;
        Engine.context.KeyringController.isUnlocked = jest
          .fn()
          .mockReturnValue(true);
        markNextParseAsUnlockSession();

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
            appStartType: 'cold',
          }),
        );
      });
    });
  });
});

describe('parseDeeplink', () => {
  const TEST_URL = 'https://link.metamask.io/buy';
  const TEST_ORIGIN = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses immediately', async () => {
    await expectSaga(parseDeeplink, TEST_URL, TEST_ORIGIN).run();

    expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
      origin: TEST_ORIGIN,
    });
  });

  it('forwards a cold appStartType to parse', async () => {
    await expectSaga(parseDeeplink, TEST_URL, TEST_ORIGIN, 'cold').run();

    expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
      origin: TEST_ORIGIN,
      appStartType: 'cold',
    });
  });

  it('forwards onHandled to parse', async () => {
    const onHandled = jest.fn();

    await expectSaga(
      parseDeeplink,
      TEST_URL,
      TEST_ORIGIN,
      undefined,
      onHandled,
    ).run();

    expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
      origin: TEST_ORIGIN,
      onHandled,
    });
  });

  it('returns false when parse throws', async () => {
    jest
      .mocked(SharedDeeplinkManager.parse)
      .mockRejectedValueOnce(new Error('boom'));

    const { returnValue } = await expectSaga(
      parseDeeplink,
      TEST_URL,
      TEST_ORIGIN,
    ).run();

    expect(returnValue).toBe(false);
  });
});

describe('parseDeeplinkAfterNavReady', () => {
  const TEST_URL = 'https://link.metamask.io/buy';
  const TEST_ORIGIN = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

  beforeEach(() => {
    jest.clearAllMocks();
    __setMainNavigatorReadyForTesting(false);
  });

  it('parses immediately when MainNavigator is already mounted', async () => {
    __setMainNavigatorReadyForTesting(true);

    await expectSaga(parseDeeplinkAfterNavReady, TEST_URL, TEST_ORIGIN).run();

    expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
      origin: TEST_ORIGIN,
    });
  });

  it('waits for MAIN_NAVIGATOR_READY when MainNavigator has not mounted (cold start)', async () => {
    await expectSaga(parseDeeplinkAfterNavReady, TEST_URL, TEST_ORIGIN)
      .dispatch(mainNavigatorReady())
      .run();

    expect(SharedDeeplinkManager.parse).toHaveBeenCalledTimes(1);
    expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
      origin: TEST_ORIGIN,
    });
  });

  it('does not parse before MAIN_NAVIGATOR_READY is dispatched', async () => {
    jest.useFakeTimers();
    try {
      // Kick off the saga with MainNavigator not ready; do NOT dispatch
      // the ready action. Advance past the timeout-safety-net so the
      // saga either parses (timeout branch) or times out the test itself.
      const racePromise = expectSaga(
        parseDeeplinkAfterNavReady,
        TEST_URL,
        TEST_ORIGIN,
      ).run({ timeout: 5000, silenceTimeout: true });

      // Before advancing timers, the saga must be blocked on `race` and
      // the deeplink must not have been parsed yet.
      expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();

      jest.advanceTimersByTime(3100);
      await racePromise;
    } finally {
      jest.useRealTimers();
    }
  });

  it('parses anyway after the safety timeout when MainNavigator never mounts', async () => {
    jest.useFakeTimers();
    try {
      const racePromise = expectSaga(
        parseDeeplinkAfterNavReady,
        TEST_URL,
        TEST_ORIGIN,
      ).run({ timeout: 5000, silenceTimeout: true });

      // Advance past the 3s safety cap inside the saga's `race`.
      jest.advanceTimersByTime(3100);
      await racePromise;

      expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
        origin: TEST_ORIGIN,
      });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('parseReferralDeeplink', () => {
  const TEST_URL = 'https://link.metamask.io/swap?ref=WEYRTZ';
  const TEST_ORIGIN = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
  const CURRENT_PARSE_ID = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetReferralLinkParseForTesting();
  });

  it('keeps the pending mark until an accepted link is handled', async () => {
    const acceptedNotYetHandled = function* (): Generator {
      yield delay(0);
      return true;
    };
    const dispatched: unknown[] = [];

    const task = runSaga(
      { dispatch: (action) => dispatched.push(action), getState: () => ({}) },
      parseReferralDeeplink,
      CURRENT_PARSE_ID,
      acceptedNotYetHandled,
      TEST_URL,
      TEST_ORIGIN,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    const isWaiting = task.isRunning();
    const dispatchedBeforeCancel = [...dispatched];
    task.cancel();

    expect(isWaiting).toBe(true);
    expect(dispatchedBeforeCancel).not.toContainEqual(
      setReferralLinkPending(false),
    );
  });

  it('releases the pending mark once an accepted link is handled', async () => {
    const acceptedThenHandled = function* (
      _deeplink: string,
      _origin: string,
      _appStartType?: 'cold' | 'warm',
      onHandled?: () => void,
    ): Generator {
      yield delay(0);
      onHandled?.();
      return true;
    };

    await expectSaga(
      parseReferralDeeplink,
      CURRENT_PARSE_ID,
      acceptedThenHandled,
      TEST_URL,
      TEST_ORIGIN,
    )
      .put(setReferralLinkPending(false))
      .run();
  });

  it('passes the handled signal through the real parse to the deeplink manager', async () => {
    __setMainNavigatorReadyForTesting(true);
    jest
      .mocked(SharedDeeplinkManager.parse)
      .mockImplementationOnce(async (_url, { onHandled }) => {
        onHandled?.();
        return true;
      });

    await expectSaga(
      parseReferralDeeplink,
      CURRENT_PARSE_ID,
      parseDeeplinkAfterNavReady,
      TEST_URL,
      TEST_ORIGIN,
    )
      .put(setReferralLinkPending(false))
      .run();
  });

  it('releases the pending mark once a parse that rejects the link ends', async () => {
    const parse = function* (): Generator {
      yield delay(0);
      return false;
    };

    await expectSaga(
      parseReferralDeeplink,
      CURRENT_PARSE_ID,
      parse,
      TEST_URL,
      TEST_ORIGIN,
    )
      .put(setReferralLinkPending(false))
      .run();
  });

  it('releases the pending mark when the parse throws', async () => {
    const failingParse = function* (): Generator {
      yield call(() => Promise.reject(new Error('parse failed')));
    };

    function* parseAndSwallow() {
      try {
        yield call(
          parseReferralDeeplink,
          CURRENT_PARSE_ID,
          failingParse,
          TEST_URL,
          TEST_ORIGIN,
        );
      } catch {
        // The failure itself is not under test.
      }
    }

    await expectSaga(parseAndSwallow).put(setReferralLinkPending(false)).run();
  });

  it('releases the pending mark when the parse is cancelled', async () => {
    const waitingParse = function* (): Generator {
      yield take('NEVER_DISPATCHED');
    };

    function* forkThenCancel() {
      const task: Task = yield fork(
        parseReferralDeeplink,
        CURRENT_PARSE_ID,
        waitingParse,
        TEST_URL,
        TEST_ORIGIN,
      );
      yield cancel(task);
    }

    await expectSaga(forkThenCancel).put(setReferralLinkPending(false)).run();
  });

  it('keeps the pending mark when a newer referral link took over', async () => {
    const parse = function* (): Generator {
      yield delay(0);
    };
    const olderParseId = CURRENT_PARSE_ID - 1;

    await expectSaga(
      parseReferralDeeplink,
      olderParseId,
      parse,
      TEST_URL,
      TEST_ORIGIN,
    )
      .not.put(setReferralLinkPending(false))
      .run();
  });
});

describe('parseDeeplinkAfterOnboarding', () => {
  const TEST_URL = 'https://link.metamask.io/swap?ref=WEYRTZ';
  const TEST_ORIGIN = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

  beforeEach(() => {
    jest.clearAllMocks();
    __setMainNavigatorReadyForTesting(false);
  });

  it('parses immediately when MainNavigator is already mounted', async () => {
    __setMainNavigatorReadyForTesting(true);

    await expectSaga(parseDeeplinkAfterOnboarding, TEST_URL, TEST_ORIGIN).run();

    expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
      origin: TEST_ORIGIN,
    });
  });

  it('parses once MainNavigator mounts', async () => {
    await expectSaga(parseDeeplinkAfterOnboarding, TEST_URL, TEST_ORIGIN)
      .dispatch(mainNavigatorReady())
      .run();

    expect(SharedDeeplinkManager.parse).toHaveBeenCalledTimes(1);
    expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
      origin: TEST_ORIGIN,
    });
  });

  it('keeps waiting past the MainNavigator ready timeout', async () => {
    jest.useFakeTimers();
    try {
      const sagaPromise = expectSaga(
        parseDeeplinkAfterOnboarding,
        TEST_URL,
        TEST_ORIGIN,
      ).run({ timeout: 10000, silenceTimeout: true });

      jest.advanceTimersByTime(9000);

      expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1100);
      await sagaPromise;
      expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('still parses once the post-unlock Home mounts after an auto-lock', async () => {
    await expectSaga(parseDeeplinkAfterOnboarding, TEST_URL, TEST_ORIGIN)
      .dispatch({ type: UserActionType.LOGOUT })
      .dispatch(mainNavigatorReady())
      .run();

    expect(SharedDeeplinkManager.parse).toHaveBeenCalledTimes(1);
    expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
      origin: TEST_ORIGIN,
    });
  });

  it('drops the destination but keeps the referral code when the wallet is reset before MainNavigator mounts', async () => {
    await expectSaga(parseDeeplinkAfterOnboarding, TEST_URL, TEST_ORIGIN)
      .dispatch({ type: CLEAR_ONBOARDING })
      .put(setPendingReferralCode('WEYRTZ'))
      .run();

    expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
  });
});

describe('mainNavigatorReadyStateMachine', () => {
  const TEST_URL = 'https://link.metamask.io/buy';
  const TEST_ORIGIN = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

  beforeEach(() => {
    jest.clearAllMocks();
    __setMainNavigatorReadyForTesting(false);
  });

  it('latches readiness so a later deeplink parses immediately', async () => {
    await expectSaga(mainNavigatorReadyStateMachine)
      .dispatch(mainNavigatorReady())
      .silentRun();

    // With the latch set, parseDeeplinkAfterNavReady should not wait.
    await expectSaga(parseDeeplinkAfterNavReady, TEST_URL, TEST_ORIGIN).run();

    expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
      origin: TEST_ORIGIN,
    });
  });

  it('clears readiness on logout', async () => {
    __setMainNavigatorReadyForTesting(true);

    await expectSaga(mainNavigatorReadyStateMachine)
      .dispatch({ type: UserActionType.LOGOUT })
      .silentRun();

    // Latch cleared: parse must wait for the next MAIN_NAVIGATOR_READY.
    await expectSaga(parseDeeplinkAfterNavReady, TEST_URL, TEST_ORIGIN)
      .dispatch(mainNavigatorReady())
      .run();

    expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(TEST_URL, {
      origin: TEST_ORIGIN,
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
