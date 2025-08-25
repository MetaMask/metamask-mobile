import { Action } from 'redux';
import { take, fork, cancel } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import {
  UserActionType,
  authError,
  authSuccess,
  checkForDeeplink,
  interruptBiometrics,
} from '../../actions/user';
import Routes from '../../constants/navigation/Routes';
import {
  biometricsStateMachine,
  authStateMachine,
  appLockStateMachine,
  lockKeyringAndApp,
  startAppServices,
  handleSDKInit,
  handleDeeplinkSaga,
} from './';
import { NavigationActionType } from '../../actions/navigation';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import SharedDeeplinkManager from '../../core/DeeplinkManager/SharedDeeplinkManager';
import Engine from '../../core/Engine';
import { setCompletedOnboarding } from '../../actions/onboarding';
import SDKConnect from '../../core/SDKConnect/SDKConnect';
import WC2Manager from '../../core/WalletConnect/WalletConnectV2';

const mockBioStateMachineId = '123';

const mockNavigate = jest.fn();

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
  },
}));

jest.mock('../../core/DeeplinkManager/SharedDeeplinkManager', () => ({
  parse: jest.fn(),
}));

jest.mock('../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    start: jest.fn(),
    pendingDeeplink: null,
    clearPendingDeeplink: jest.fn(),
  },
}));

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

describe('authStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should fork appLockStateMachine when logged in', async () => {
    const generator = authStateMachine();
    expect(generator.next().value).toEqual(take(UserActionType.LOGIN));
    expect(generator.next().value).toEqual(fork(appLockStateMachine));
  });

  it('should cancel appLockStateMachine when logged out', async () => {
    const generator = authStateMachine();
    // Logged in
    generator.next();
    // Fork appLockStateMachine
    generator.next();
    expect(generator.next().value).toEqual(take(UserActionType.LOGOUT));
    expect(generator.next().value).toEqual(cancel());
  });
});

describe('appLockStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should fork biometricsStateMachine when app is locked', async () => {
    const generator = appLockStateMachine();
    expect(generator.next().value).toEqual(take(UserActionType.LOCKED_APP));
    // Fork biometrics listener.
    expect(generator.next().value).toEqual(
      fork(biometricsStateMachine, mockBioStateMachineId),
    );
  });

  it('should navigate to LockScreen when app is locked', async () => {
    const generator = appLockStateMachine();
    // Lock app.
    generator.next();
    // Fork biometricsStateMachine
    generator.next();
    // Move to next step
    generator.next();
    expect(mockNavigate).toBeCalledWith(Routes.LOCK_SCREEN, {
      bioStateMachineId: mockBioStateMachineId,
    });
  });
});

describe('biometricsStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should lock app if biometrics is interrupted', async () => {
    const generator = biometricsStateMachine(mockBioStateMachineId);
    // Take next step
    expect(generator.next().value).toEqual(
      take([
        UserActionType.AUTH_SUCCESS,
        UserActionType.AUTH_ERROR,
        UserActionType.INTERRUPT_BIOMETRICS,
      ]),
    );
    // Dispatch interrupt biometrics
    const nextFork = generator.next(interruptBiometrics() as Action).value;
    expect(nextFork).toEqual(fork(lockKeyringAndApp));
  });

  it('should navigate to Wallet when authenticating without interruptions via biometrics', async () => {
    const generator = biometricsStateMachine(mockBioStateMachineId);
    // Take next step
    generator.next();
    // Dispatch interrupt biometrics
    generator.next(authSuccess(mockBioStateMachineId) as Action);
    // Move to next step
    expect(mockNavigate).toBeCalledWith(Routes.ONBOARDING.HOME_NAV);
  });

  it('should not navigate to Wallet when authentication succeeds with different bioStateMachineId', async () => {
    const generator = biometricsStateMachine(mockBioStateMachineId);
    // Take next step
    generator.next();
    // Dispatch interrupt biometrics
    generator.next(authSuccess('wrongBioStateMachineId') as Action);
    // Move to next step
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should not do anything when AUTH_ERROR is encountered', async () => {
    const generator = biometricsStateMachine(mockBioStateMachineId);
    // Take next step
    generator.next();
    // Dispatch interrupt biometrics
    generator.next(authError(mockBioStateMachineId) as Action);
    // Move to next step
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// TODO: Update all saga tests to use expectSaga (more intuitive and easier to read)
describe('startAppServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start app services when gates open', async () => {
    await expectSaga(startAppServices)
      .withState({
        onboarding: { completedOnboarding: false },
        user: {},
      })
      // Dispatch both required actions
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .run();

    // Verify services are started
    expect(EngineService.start).toHaveBeenCalled();
    expect(AppStateEventProcessor.start).toHaveBeenCalled();
  });

  it('should not start app services if navigation is not ready', async () => {
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

  it('should not start app services if persisted data is not loaded', async () => {
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

describe('handleSDKInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to locked
    Engine.context.KeyringController.isUnlocked = jest
      .fn()
      .mockReturnValue(false);
  });

  it('initializes SDKConnect on LOGIN after gates, then WalletConnect V2', async () => {
    await expectSaga(handleSDKInit)
      .withState({ onboarding: { completedOnboarding: false } })
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .dispatch({ type: UserActionType.LOGIN })
      .run();

    expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
    expect(WC2Manager.init).toHaveBeenCalledWith({});
  });

  it('initializes when onboarding completed is true and keyring is unlocked', async () => {
    Engine.context.KeyringController.isUnlocked = jest
      .fn()
      .mockReturnValue(true);

    await expectSaga(handleSDKInit)
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .dispatch(setCompletedOnboarding(true))
      .run();

    expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
    expect(WC2Manager.init).toHaveBeenCalledWith({});
  });

  it('does not initialize when keyring is locked even if onboarding is complete', async () => {
    Engine.context.KeyringController.isUnlocked = jest
      .fn()
      .mockReturnValue(false);

    await expectSaga(handleSDKInit)
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .dispatch(setCompletedOnboarding(true))
      .silentRun(10);

    expect(SDKConnect.init).not.toHaveBeenCalled();
    expect(WC2Manager.init).not.toHaveBeenCalled();
  });

  it('still initializes WalletConnect V2 if SDKConnect.init throws', async () => {
    (SDKConnect.init as jest.Mock).mockRejectedValueOnce(new Error('fail'));

    await expectSaga(handleSDKInit)
      .withState({ onboarding: { completedOnboarding: false } })
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .dispatch({ type: UserActionType.LOGIN })
      .run();

    expect(SDKConnect.init).toHaveBeenCalledWith({ context: 'Nav/App' });
    expect(WC2Manager.init).toHaveBeenCalledWith({});
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
          user: {},
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
            user: {},
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
      });
    });
    describe('when app is unlocked', () => {
      describe('when completed onboarding is false', () => {
        it('should skip handling deeplink', async () => {
          AppStateEventProcessor.pendingDeeplink = 'dummy-deeplink';

          // Triggered by SET_COMPLETED_ONBOARDING action
          await expectSaga(handleDeeplinkSaga)
            .dispatch(setCompletedOnboarding(false))
            .silentRun();

          expect(
            Engine.context.KeyringController.isUnlocked,
          ).toHaveBeenCalled();
          expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
          expect(
            AppStateEventProcessor.clearPendingDeeplink,
          ).not.toHaveBeenCalled();
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
            .dispatch(setCompletedOnboarding(true))
            .silentRun();

          expect(
            Engine.context.KeyringController.isUnlocked,
          ).toHaveBeenCalled();
          expect(SharedDeeplinkManager.parse).toHaveBeenCalled();
          expect(
            AppStateEventProcessor.clearPendingDeeplink,
          ).toHaveBeenCalled();
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
              user: {},
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
        });
      });
    });
  });
});
