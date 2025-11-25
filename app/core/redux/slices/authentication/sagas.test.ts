/**
 * Authentication Saga Tests
 *
 * Tests for route restoration after background/foreground re-authentication
 */

import { expectSaga } from 'redux-saga-test-plan';
import { call } from 'redux-saga-test-plan/matchers';
import {
  appBackgroundedSaga,
  requestAuthenticationSaga,
  lockAppSaga,
  logoutSaga,
} from './sagas';
import {
  saveNavigationStateBeforeLock,
  clearNavigationStateBeforeLock,
  appLocked,
  authenticationSuccess,
  logoutComplete,
  AuthenticationMethod,
  AuthenticationState,
} from '.';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import { Authentication } from '../../..';
import { AppStateService } from '../../../AppStateService/AppStateService';

// Mock modules
jest.mock('../../../NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: jest.fn(),
      reset: jest.fn(),
      getCurrentRoute: jest.fn(),
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
  },
}));

describe('Authentication Saga - Route Restoration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('appBackgroundedSaga', () => {
    it('should save navigation state when app backgrounds', async () => {
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

      const mockState = {
        authentication: {
          currentState: AuthenticationState.AUTHENTICATED,
        },
        security: {
          allowLoginWithRememberMe: false,
        },
        settings: {
          lockTime: 30000, // 30 seconds
        },
      };

      // Mock NavigationService to return navigation state
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

    it('should not save navigation state if current route is login screen', async () => {
      const mockState = {
        authentication: {
          currentState: AuthenticationState.AUTHENTICATED,
        },
        security: {
          allowLoginWithRememberMe: false,
        },
        settings: {
          lockTime: 30000,
        },
      };

      // Mock NavigationService to return Login route
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

    it('should not save navigation state if Remember Me is enabled', async () => {
      const mockState = {
        authentication: {
          currentState: AuthenticationState.AUTHENTICATED,
        },
        security: {
          allowLoginWithRememberMe: true, // Remember Me enabled
        },
        settings: {
          lockTime: 30000,
        },
      };

      // Mock NavigationService
      NavigationService.navigation = {
        getState: () => ({ index: 0, routes: [{ name: 'SecuritySettings' }] }),
        getCurrentRoute: () => ({ name: 'SecuritySettings' }),
      } as unknown as typeof NavigationService.navigation;

      await expectSaga(appBackgroundedSaga)
        .withState(mockState)
        .not.put.like({ action: { type: saveNavigationStateBeforeLock.type } })
        .run();
    });

    it('should not save navigation state if not authenticated', async () => {
      const mockState = {
        authentication: {
          currentState: AuthenticationState.LOCKED,
        },
        security: {
          allowLoginWithRememberMe: false,
        },
        settings: {
          lockTime: 30000,
        },
      };

      // Mock NavigationService
      NavigationService.navigation = {
        getState: () => ({ index: 0, routes: [{ name: 'SecuritySettings' }] }),
        getCurrentRoute: () => ({ name: 'SecuritySettings' }),
      } as unknown as typeof NavigationService.navigation;

      await expectSaga(appBackgroundedSaga)
        .withState(mockState)
        .not.put.like({ action: { type: saveNavigationStateBeforeLock.type } })
        .run();
    });
  });

  describe('requestAuthenticationSaga', () => {
    it('should restore navigation state after successful authentication', async () => {
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

      const mockState = {
        authentication: {
          context: {
            navigationStateBeforeLock: mockNavigationState,
          },
        },
      };

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
          // Mock password authentication to succeed
          [call.fn(Authentication.getType), { currentAuthType: 'password' }],
          [call([Authentication, 'userEntryAuth']), true],
        ])
        .put(
          authenticationSuccess({
            method: AuthenticationMethod.PASSWORD,
            timestamp: expect.any(Number) as number,
          }),
        )
        .put(clearNavigationStateBeforeLock())
        .run();

      // Should reset to the saved navigation state
      expect(mockReset).toHaveBeenCalledWith(mockNavigationState);
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('should navigate to HOME if no navigation state is stored', async () => {
      const mockState = {
        authentication: {
          context: {
            navigationStateBeforeLock: undefined, // No stored state
          },
        },
      };

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
        .withState(mockState)
        .provide([
          [call.fn(Authentication.getType), { currentAuthType: 'password' }],
          [call([Authentication, 'userEntryAuth']), true],
        ])
        .put(
          authenticationSuccess({
            method: AuthenticationMethod.PASSWORD,
            timestamp: expect.any(Number) as number,
          }),
        )
        .not.put(clearNavigationStateBeforeLock())
        .run();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
    });
  });

  describe('lockAppSaga', () => {
    it('should clear stored navigation state on manual lock', async () => {
      await expectSaga(lockAppSaga, {
        type: 'authentication/lockApp',
        payload: { shouldNavigate: true },
      })
        .provide([
          [call([Authentication, 'lockApp']), undefined],
          [call([AppStateService, 'clearLockTimer']), undefined],
        ])
        .put(clearNavigationStateBeforeLock())
        .put(appLocked({ shouldNavigate: true }))
        .run();
    });
  });

  describe('logoutSaga', () => {
    it('should clear stored navigation state on logout', async () => {
      await expectSaga(logoutSaga)
        .provide([
          [call([Authentication, 'lockApp']), undefined],
          [call([AppStateService, 'clearLockTimer']), undefined],
        ])
        .put(clearNavigationStateBeforeLock())
        .put(logoutComplete())
        .run();
    });
  });
});

describe('Authentication Saga - Navigation State Restoration Integration', () => {
  it('should complete full background/foreground/restore flow', async () => {
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

    // Mock state that evolves through the flow
    let mockState = {
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
        lockTime: 0, // Immediate lock for testing
      },
    };

    // Mock NavigationService to return navigation state
    const mockNavigation = {
      getRootState: jest.fn(() => mockNavigationState),
      getCurrentRoute: jest.fn(() => ({ name: testRoute })),
    };
    NavigationService.navigation =
      mockNavigation as unknown as typeof NavigationService.navigation;

    // Step 1: App backgrounds - should save navigation state
    await expectSaga(appBackgroundedSaga)
      .withState(mockState)
      .provide([[call([Authentication, 'lockApp']), undefined]])
      .put(
        saveNavigationStateBeforeLock(
          mockNavigationState as unknown as undefined,
        ),
      )
      .run();

    expect(mockNavigation.getRootState).toHaveBeenCalled();

    // Simulate navigation state being saved
    mockState = {
      ...mockState,
      authentication: {
        ...mockState.authentication,
        context: {
          navigationStateBeforeLock:
            mockNavigationState as unknown as undefined,
        },
      },
    };

    // Step 2: User re-authenticates - should restore navigation state
    const mockReset = jest.fn();
    NavigationService.navigation = {
      reset: mockReset,
    } as unknown as typeof NavigationService.navigation;

    await expectSaga(requestAuthenticationSaga, {
      type: 'authentication/requestAuthentication',
      payload: {
        method: AuthenticationMethod.BIOMETRIC,
      },
    })
      .withState(mockState)
      .provide([
        [call.fn(Authentication.getType), { currentAuthType: 'biometrics' }],
        [call.fn(Authentication.appTriggeredAuth), true],
      ])
      .put(
        authenticationSuccess({
          method: AuthenticationMethod.BIOMETRIC,
          timestamp: expect.any(Number) as number,
        }),
      )
      .put(clearNavigationStateBeforeLock())
      .run();

    // Verify navigation state was restored
    expect(mockReset).toHaveBeenCalledWith(mockNavigationState);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
