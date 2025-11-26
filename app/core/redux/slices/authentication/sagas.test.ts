/**
 * Authentication Saga Tests
 *
 * Comprehensive tests for all authentication saga operations
 */

import { expectSaga } from 'redux-saga-test-plan';
import { call } from 'redux-saga-test-plan/matchers';
import {
  initializeAuthenticationSaga,
  appBackgroundedSaga,
  requestAuthenticationSaga,
  lockAppSaga,
  logoutSaga,
  appForegroundedSaga,
  backgroundTimerExpiredSaga,
  checkBiometricAvailabilitySaga,
  attemptRememberMeLoginSaga,
} from './sagas';
import {
  saveNavigationStateBeforeLock,
  clearNavigationStateBeforeLock,
  appLocked,
  authenticationSuccess,
  authenticationFailed,
  logoutComplete,
  initializationComplete,
  checkBiometricAvailability,
  biometricAvailabilityChecked,
  requestAuthentication,
  attemptRememberMeLogin,
  AuthenticationMethod,
  AuthenticationState,
} from '.';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import { Authentication } from '../../..';
import { AppStateService } from '../../../AppStateService/AppStateService';
import SecureKeychain from '../../../SecureKeychain';
import Engine from '../../../Engine';
import { lockApp as lockAppAction } from '../../../../actions/user';
import { isUserCancellation } from '../../../Authentication/biometricErrorUtils';

// Mock modules
jest.mock('../../../NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: jest.fn(),
      reset: jest.fn(),
      getCurrentRoute: jest.fn(),
      getRootState: jest.fn(),
    },
  },
}));

jest.mock('../../../AppStateService/AppStateService', () => ({
  AppStateService: {
    clearLockTimer: jest.fn(),
    startLockTimer: jest.fn(),
    isLockTimerActive: jest.fn(),
    initialize: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

jest.mock('../../..', () => ({
  Authentication: {
    lockApp: jest.fn(),
    getPassword: jest.fn(),
    getType: jest.fn(),
    userEntryAuth: jest.fn(),
    appTriggeredAuth: jest.fn(),
    dispatchLogin: jest.fn(),
  },
}));

jest.mock('../../../SecureKeychain', () => ({
  __esModule: true,
  default: {
    getSupportedBiometryType: jest.fn(),
  },
}));

jest.mock('../../../Engine', () => ({
  context: {
    KeyringController: {
      submitPassword: jest.fn(),
      isUnlocked: jest.fn(),
      setLocked: jest.fn(),
    },
  },
}));

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
  },
}));

jest.mock('../../../Authentication/biometricErrorUtils', () => ({
  isUserCancellation: jest.fn(),
}));

const mockRunAfterInteractions = jest.fn((callback) => {
  if (callback) callback();
  return Promise.resolve();
});

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: mockRunAfterInteractions,
  },
}));

const createMockState = (overrides = {}) => ({
  authentication: {
    currentState: AuthenticationState.AUTHENTICATED,
    context: {
      navigationStateBeforeLock: undefined,
    },
  },
  security: {
    allowLoginWithRememberMe: false,
  },
  settings: {
    lockTime: 30000,
  },
  user: {
    existingUser: true,
  },
  ...overrides,
});

describe('initializeAuthenticationSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(123);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('navigates to onboarding when no existing user', async () => {
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(initializeAuthenticationSaga)
      .withState({
        authentication: {},
        user: { existingUser: false },
      })
      .provide([[call([AppStateService, 'initialize']), undefined]])
      .put(checkBiometricAvailability())
      .put(
        initializationComplete({
          hasUser: false,
          isLocked: false,
        }),
      )
      .run();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
    });
  });

  it('navigates to login when credentials are missing', async () => {
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(initializeAuthenticationSaga)
      .withState(createMockState())
      .provide([
        [call([AppStateService, 'initialize']), undefined],

        [call([Authentication, 'getType']), { currentAuthType: 'password' }],
      ])
      .put(checkBiometricAvailability())
      .put(
        initializationComplete({
          hasUser: true,
          isLocked: true,
        }),
      )
      .run();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked: true } }],
    });
  });

  it('triggers Remember Me login when enabled', async () => {
    await expectSaga(initializeAuthenticationSaga)
      .withState(
        createMockState({
          security: {
            allowLoginWithRememberMe: true,
          },
        }),
      )
      .provide([
        [call([AppStateService, 'initialize']), undefined],

        [call([Authentication, 'getType']), { currentAuthType: 'remember_me' }],
      ])
      .put(checkBiometricAvailability())
      .put(attemptRememberMeLogin())
      .run();
  });

  it('navigates to login when no biometric auth is configured', async () => {
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(initializeAuthenticationSaga)
      .withState(createMockState())
      .provide([
        [call([AppStateService, 'initialize']), undefined],

        [call([Authentication, 'getType']), { currentAuthType: 'password' }],
      ])
      .put(checkBiometricAvailability())
      .put(
        initializationComplete({
          hasUser: true,
          isLocked: true,
        }),
      )
      .run();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked: true } }],
    });
  });

  it('handles errors during credential check', async () => {
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(initializeAuthenticationSaga)
      .withState(createMockState())
      .provide([
        [call([AppStateService, 'initialize']), undefined],

        [call([Authentication, 'getType']), { currentAuthType: 'password' }],
      ])
      .put(checkBiometricAvailability())
      .put(
        initializationComplete({
          hasUser: true,
          isLocked: true,
        }),
      )
      .run();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked: true } }],
    });
  });

  it('returns early when authentication state is missing', async () => {
    await expectSaga(initializeAuthenticationSaga)
      .withState({
        authentication: undefined,
      })
      .not.put(checkBiometricAvailability())
      .run();
  });
});

describe('requestAuthenticationSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(123);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('authenticates with password and navigates to home', async () => {
    const mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(requestAuthenticationSaga, {
      type: 'authentication/requestAuthentication',
      payload: {
        method: AuthenticationMethod.PASSWORD,
        password: 'test-password',
      },
    })
      .withState(createMockState())
      .provide([
        [call([Authentication, 'getType']), { currentAuthType: 'password' }],
        [call([Authentication, 'userEntryAuth']), undefined],
      ])
      .put(
        authenticationSuccess({
          method: AuthenticationMethod.PASSWORD,
          timestamp: 123,
        }),
      )
      .run();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
  });

  it('restores navigation state after successful authentication', async () => {
    const testRoute = 'SecuritySettings';
    const mockNavigationState = {
      index: 0,
      routes: [
        {
          name: Routes.ONBOARDING.HOME_NAV,
          state: { index: 0, routes: [{ name: testRoute }] },
        },
      ],
    };

    const mockState = createMockState({
      authentication: {
        currentState: AuthenticationState.AUTHENTICATED,
        context: {
          navigationStateBeforeLock: mockNavigationState,
        },
      },
    });

    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(requestAuthenticationSaga, {
      type: 'authentication/requestAuthentication',
      payload: {
        method: AuthenticationMethod.PASSWORD,
        password: 'test-password',
      },
    })
      .withState(mockState)
      .provide([
        [call([Authentication, 'getType']), { currentAuthType: 'password' }],
        [call([Authentication, 'userEntryAuth']), undefined],
      ])
      .put(
        authenticationSuccess({
          method: AuthenticationMethod.PASSWORD,
          timestamp: 123,
        }),
      )
      .put(clearNavigationStateBeforeLock())
      .run();

    expect(mockReset).toHaveBeenCalledWith(mockNavigationState);
  });

  it('handles password authentication failure', async () => {
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
      getCurrentRoute: jest.fn(() => ({ name: 'SomeScreen' })),
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(requestAuthenticationSaga, {
      type: 'authentication/requestAuthentication',
      payload: {
        method: AuthenticationMethod.PASSWORD,
        password: 'wrong-password',
      },
    })
      .withState(createMockState())
      .provide([
        [call([Authentication, 'getType']), { currentAuthType: 'password' }],
        [
          call([Authentication, 'userEntryAuth'], 'wrong-password', {
            currentAuthType: 'password',
          }),
          Promise.reject(new Error('Invalid password')),
        ],
      ])
      .put(
        authenticationFailed({
          method: AuthenticationMethod.PASSWORD,
          error: 'Authentication failed',
        }),
      )
      .run();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked: true } }],
    });
  });

  it('returns error when password is missing for password method', async () => {
    await expectSaga(requestAuthenticationSaga, {
      type: 'authentication/requestAuthentication',
      payload: {
        method: AuthenticationMethod.PASSWORD,
      },
    })
      .put(
        authenticationFailed({
          method: AuthenticationMethod.PASSWORD,
          error: 'Password is required',
        }),
      )
      .run();
  });

  it('navigates to login when biometric is cancelled', async () => {
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
      getCurrentRoute: jest.fn(() => ({ name: 'SomeScreen' })),
    } as unknown as typeof NavigationService.navigation;

    (isUserCancellation as jest.Mock).mockReturnValue(true);

    await expectSaga(requestAuthenticationSaga, {
      type: 'authentication/requestAuthentication',
      payload: {
        method: AuthenticationMethod.BIOMETRIC,
        showBiometric: true,
      },
    })
      .withState(createMockState())
      .provide([
        [
          call([Authentication, 'appTriggeredAuth']),
          new Error('User cancelled'),
        ],
      ])
      .run();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked: true } }],
    });
  });

  it('handles unknown authentication method', async () => {
    await expectSaga(requestAuthenticationSaga, {
      type: 'authentication/requestAuthentication',
      payload: {
        method: 'UNKNOWN_METHOD' as AuthenticationMethod,
      },
    }).run();
  });
});

describe('appBackgroundedSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves navigation state when app backgrounds', async () => {
    const testRoute = 'SecuritySettings';
    const mockNavigationState = {
      index: 0,
      routes: [
        {
          name: Routes.ONBOARDING.HOME_NAV,
          state: { index: 0, routes: [{ name: testRoute }] },
        },
      ],
    };

    const mockState = createMockState({
      authentication: {
        currentState: AuthenticationState.AUTHENTICATED,
      },
    });

    const mockNavigation = {
      getRootState: jest.fn(() => mockNavigationState),
      getCurrentRoute: jest.fn(() => ({ name: testRoute })),
    };
    NavigationService.navigation =
      mockNavigation as unknown as typeof NavigationService.navigation;

    await expectSaga(appBackgroundedSaga)
      .withState(mockState)
      .provide([[call.fn(AppStateService.startLockTimer), undefined]])
      .put(saveNavigationStateBeforeLock(mockNavigationState))
      .run();

    expect(mockNavigation.getRootState).toHaveBeenCalled();
    expect(mockNavigation.getCurrentRoute).toHaveBeenCalled();
  });

  it('skips saving navigation state when current route is login', async () => {
    const mockState = createMockState({
      authentication: {
        currentState: AuthenticationState.AUTHENTICATED,
      },
    });

    NavigationService.navigation = {
      getRootState: () => ({
        index: 0,
        routes: [{ name: Routes.ONBOARDING.LOGIN }],
      }),
      getCurrentRoute: () => ({ name: Routes.ONBOARDING.LOGIN }),
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(appBackgroundedSaga)
      .withState(mockState)
      .provide([[call.fn(AppStateService.startLockTimer), undefined]])
      .not.put.like({ action: { type: saveNavigationStateBeforeLock.type } })
      .run();
  });

  it('skips saving navigation state when Remember Me is enabled', async () => {
    const mockState = createMockState({
      authentication: {
        currentState: AuthenticationState.AUTHENTICATED,
      },
      security: {
        allowLoginWithRememberMe: true,
      },
    });

    await expectSaga(appBackgroundedSaga)
      .withState(mockState)
      .not.put.like({ action: { type: saveNavigationStateBeforeLock.type } })
      .run();
  });

  it('skips saving navigation state when not authenticated', async () => {
    const mockState = createMockState({
      authentication: {
        currentState: AuthenticationState.LOCKED,
      },
    });

    await expectSaga(appBackgroundedSaga)
      .withState(mockState)
      .not.put.like({ action: { type: saveNavigationStateBeforeLock.type } })
      .run();
  });

  it('locks app immediately when lockTime is 0', async () => {
    const mockState = createMockState({
      authentication: {
        currentState: AuthenticationState.AUTHENTICATED,
      },
      settings: {
        lockTime: 0,
      },
    });

    await expectSaga(appBackgroundedSaga)
      .withState(mockState)
      .provide([[call([Authentication, 'lockApp']), undefined]])
      .put(lockAppAction())
      .put(appLocked({ shouldNavigate: false }))
      .run();
  });

  it('skips lock timer when lockTime is -1', async () => {
    const mockState = createMockState({
      authentication: {
        currentState: AuthenticationState.AUTHENTICATED,
      },
      settings: {
        lockTime: -1,
      },
    });

    await expectSaga(appBackgroundedSaga)
      .withState(mockState)
      .not.put.like({ action: { type: appLocked.type } })
      .run();
  });
});

describe('appForegroundedSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(123);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clears lock timer when timer is active', async () => {
    const mockState = createMockState({
      authentication: {
        currentState: AuthenticationState.AUTHENTICATED,
      },
    });

    (AppStateService.isLockTimerActive as jest.Mock).mockReturnValue(true);
    (AppStateService.clearLockTimer as jest.Mock).mockResolvedValue(undefined);

    await expectSaga(appForegroundedSaga)
      .withState(mockState)
      .provide([[call([AppStateService, 'isLockTimerActive']), true]])
      .run();

    expect(AppStateService.clearLockTimer).toHaveBeenCalled();
  });

  it('does not trigger biometric when app is not locked', async () => {
    const mockState = createMockState({
      authentication: {
        currentState: AuthenticationState.AUTHENTICATED,
      },
    });

    await expectSaga(appForegroundedSaga)
      .withState(mockState)
      .provide([[call([AppStateService, 'isLockTimerActive']), false]])
      .not.put.like({
        action: { type: requestAuthentication.type },
      })
      .run();
  });
});

describe('backgroundTimerExpiredSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('locks app when background timer expires', async () => {
    await expectSaga(backgroundTimerExpiredSaga)
      .provide([
        [
          call([Authentication, 'lockApp'], {
            reset: false,
            locked: true,
            navigateToLogin: false,
          }),
          undefined,
        ],
      ])
      .put(lockAppAction())
      .put(appLocked({ shouldNavigate: false }))
      .run();
  });
});

describe('checkBiometricAvailabilitySaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports biometric as available when supported', async () => {
    (SecureKeychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
      'FaceID',
    );

    await expectSaga(checkBiometricAvailabilitySaga)
      .put(
        biometricAvailabilityChecked({
          available: true,
          biometryType: 'FaceID',
        }),
      )
      .run();
  });

  it('reports biometric as unavailable when not supported', async () => {
    (SecureKeychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
      null,
    );

    await expectSaga(checkBiometricAvailabilitySaga)
      .put(
        biometricAvailabilityChecked({
          available: false,
          biometryType: undefined,
        }),
      )
      .run();
  });

  it('handles errors when checking biometric availability', async () => {
    (SecureKeychain.getSupportedBiometryType as jest.Mock).mockRejectedValue(
      new Error('Biometric check failed'),
    );

    await expectSaga(checkBiometricAvailabilitySaga)
      .put(
        biometricAvailabilityChecked({
          available: false,
          error: 'Biometric check failed',
        }),
      )
      .run();
  });
});

describe('attemptRememberMeLoginSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(123);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('unlocks wallet and navigates to home when Remember Me succeeds', async () => {
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(attemptRememberMeLoginSaga)
      .provide([
        [call([Authentication, 'getType']), { currentAuthType: 'REMEMBER_ME' }],
        [call([Authentication, 'getPassword']), { password: 'test-password' }],
        [call([Engine.context.KeyringController, 'submitPassword']), undefined],
        [call([Authentication, 'dispatchLogin']), undefined],
      ])
      .put(
        authenticationSuccess({
          method: AuthenticationMethod.REMEMBER_ME,
          timestamp: 123,
        }),
      )
      .put(
        initializationComplete({
          hasUser: true,
          isLocked: false,
        }),
      )
      .run();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
  });

  it('navigates to login when credentials are missing', async () => {
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(attemptRememberMeLoginSaga)
      .provide([
        [call([Authentication, 'getType']), { currentAuthType: 'REMEMBER_ME' }],
        [call([Authentication, 'getPassword']), null],
      ])
      .put(
        initializationComplete({
          hasUser: true,
          isLocked: true,
        }),
      )
      .run();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN }],
    });
  });

  it('navigates to login when getPassword throws error', async () => {
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
    } as unknown as typeof NavigationService.navigation;

    (isUserCancellation as jest.Mock).mockReturnValue(false);

    await expectSaga(attemptRememberMeLoginSaga)
      .provide([
        [call([Authentication, 'getType']), { currentAuthType: 'REMEMBER_ME' }],
        [
          call([Authentication, 'getPassword']),
          new Error('Failed to get password'),
        ],
      ])
      .put(
        initializationComplete({
          hasUser: true,
          isLocked: true,
        }),
      )
      .run();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN }],
    });
  });

  it('handles errors during Remember Me login', async () => {
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(attemptRememberMeLoginSaga)
      .provide([
        [call([Authentication, 'getType']), { currentAuthType: 'REMEMBER_ME' }],
        [call([Authentication, 'getPassword']), { password: 'test-password' }],
        [
          call([Engine.context.KeyringController, 'submitPassword']),
          new Error('Keyring unlock failed'),
        ],
      ])
      .put(
        initializationComplete({
          hasUser: true,
          isLocked: true,
        }),
      )
      .run();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN }],
    });
  });
});

describe('lockAppSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('locks app and clears navigation state', async () => {
    await expectSaga(lockAppSaga, {
      type: 'authentication/lockApp',
      payload: { shouldNavigate: true },
    })
      .provide([
        [
          call([Authentication, 'lockApp'], {
            reset: false,
            locked: true,
            navigateToLogin: true,
          }),
          undefined,
        ],
        [call([AppStateService, 'clearLockTimer']), undefined],
      ])
      .put(clearNavigationStateBeforeLock())
      .put(appLocked({ shouldNavigate: true }))
      .run();
  });

  it('locks app without navigation when shouldNavigate is false', async () => {
    await expectSaga(lockAppSaga, {
      type: 'authentication/lockApp',
      payload: { shouldNavigate: false },
    })
      .provide([
        [
          call([Authentication, 'lockApp'], {
            reset: false,
            locked: true,
            navigateToLogin: false,
          }),
          undefined,
        ],
        [call([AppStateService, 'clearLockTimer']), undefined],
      ])
      .put(clearNavigationStateBeforeLock())
      .put(appLocked({ shouldNavigate: false }))
      .run();
  });
});

describe('logoutSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('locks app and clears navigation state on logout', async () => {
    await expectSaga(logoutSaga)
      .provide([
        [
          call([Authentication, 'lockApp'], {
            reset: true,
            locked: true,
            navigateToLogin: true,
          }),
          undefined,
        ],
        [call([AppStateService, 'clearLockTimer']), undefined],
      ])
      .put(clearNavigationStateBeforeLock())
      .put(logoutComplete())
      .run();
  });
});
