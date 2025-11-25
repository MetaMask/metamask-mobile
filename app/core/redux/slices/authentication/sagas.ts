/**
 * Authentication Sagas
 *
 * This saga orchestrates authentication by:
 * 1. Using the actual Authentication API (userEntryAuth, appTriggeredAuth, etc.)
 * 2. Integrating with existing Redux actions (LOGIN, LOGOUT, AUTH_SUCCESS, etc.)
 * 3. Coordinating with bioStateMachineId for biometric flows
 * 4. Providing new capabilities while maintaining backward compatibility
 */

import {
  takeLatest,
  call,
  put,
  select,
  delay,
  race,
  take,
  fork,
  cancelled,
} from 'redux-saga/effects';
import { eventChannel, EventChannel } from 'redux-saga';
import { PayloadAction } from '@reduxjs/toolkit';
import { InteractionManager } from 'react-native';
import { Authentication } from '../../../';
import { AppStateService } from '../../../AppStateService/AppStateService';
import NavigationService from '../../../NavigationService';
import SecureKeychain from '../../../SecureKeychain';
import Engine from '../../../Engine';
import Logger from '../../../../util/Logger';
import { isUserCancellation } from '../../../Authentication/biometricErrorUtils';
import {
  // Actions
  initializeAuthentication,
  initializationComplete,
  requestAuthentication,
  authenticationSuccess,
  authenticationFailed,
  lockApp,
  appLocked,
  appUnlocked,
  checkBiometricAvailability,
  biometricAvailabilityChecked,
  appBackgrounded,
  appForegrounded,
  backgroundTimerExpired,
  attemptRememberMeLogin,
  logout,
  logoutComplete,
  authenticationError,
  saveNavigationStateBeforeLock,
  clearNavigationStateBeforeLock,
  // Selectors
  selectCurrentAuthState,
  selectIsAuthenticated,
  selectIsRememberMeEnabled,
  selectLockTime,
  selectNavigationStateBeforeLock,
  // Enums/Types
  AuthenticationMethod,
  AuthenticationState,
} from '.';
import StorageWrapper from '../../../../store/storage-wrapper';
import Routes from '../../../../constants/navigation/Routes';
import { BIOMETRY_CHOICE } from '../../../../constants/storage';
import { selectExistingUser } from '../../../../reducers/user/selectors';
import {
  UserActionType,
  lockApp as lockAppAction,
} from '../../../../actions/user';
import ReduxService from '../../../redux';

// Alias for cleaner code
const actions = {
  initializeAuthentication,
  initializationComplete,
  requestAuthentication,
  authenticationSuccess,
  authenticationFailed,
  lockApp,
  appLocked,
  appUnlocked,
  checkBiometricAvailability,
  biometricAvailabilityChecked,
  appBackgrounded,
  appForegrounded,
  backgroundTimerExpired,
  attemptRememberMeLogin,
  logout,
  logoutComplete,
  authenticationError,
  saveNavigationStateBeforeLock,
  clearNavigationStateBeforeLock,
};

const selectors = {
  selectCurrentAuthState,
  selectIsAuthenticated,
  selectIsRememberMeEnabled,
  selectLockTime,
  selectNavigationStateBeforeLock,
};

// ==========================================================================
// Constants
// ==========================================================================

const DEFAULT_LOCK_TIMER_DURATION = 30000; // 30 seconds
const BIOMETRIC_TIMEOUT = 30000; // 30 seconds for biometric prompt

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Wait for all interactions/animations to complete before proceeding
 * This is the proper React Native way to ensure the UI is ready
 * Much better than fixed delays - it runs immediately when ready!
 */
function waitForInteractions(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve();
    });
  });
}

// ==========================================================================
// Initialization Saga
// ==========================================================================

/**
 * Initialize the authentication system on app start
 * This determines the initial state based on stored credentials
 */
export function* initializeAuthenticationSaga() {
  try {
    Logger.log('AuthSaga: Initializing authentication system');

    // Debug: Check if authentication state exists in store
    const authState: AuthenticationState | undefined = yield select(
      (state: { authentication?: unknown }) => state.authentication,
    );
    if (!authState) {
      Logger.error(
        new Error('Authentication state not found in Redux store!'),
        'AuthSaga: CRITICAL - Reducer not added to store',
      );
      return;
    }
    Logger.log('AuthSaga: Authentication state exists in Redux store ✅');

    // Initialize services
    yield call([AppStateService, 'initialize']);

    // Wait a moment for navigation to be ready (set by NavigationProvider)
    yield delay(100);

    // Check if user exists (use Redux selector - actual API doesn't have this method)
    const hasExistingUser: boolean = yield select(selectExistingUser);

    // Check biometric availability
    yield put(actions.checkBiometricAvailability());

    if (!hasExistingUser) {
      // First time user - go to onboarding
      Logger.log('AuthSaga: No existing user, going to onboarding');
      yield put(
        actions.initializationComplete({
          hasUser: false,
          isLocked: false,
        }),
      );
      NavigationService.navigation?.reset({
        index: 0,
        routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
      });
      return;
    }

    // Existing user - check if we have credentials
    try {
      // Use actual Authentication API method: getPassword()
      const credentials: { password: string } | false | null = yield call([
        Authentication,
        'getPassword',
      ]);
      const hasCredentials =
        !!credentials &&
        typeof credentials === 'object' &&
        !!credentials.password;

      if (!hasCredentials) {
        // No credentials - user needs to authenticate
        Logger.log('AuthSaga: No credentials found, user must login');
        yield put(
          actions.initializationComplete({
            hasUser: true,
            isLocked: true,
          }),
        );

        // Navigate to Login (no auto-biometric needed, no credentials)
        NavigationService.navigation?.reset({
          index: 0,
          routes: [{ name: Routes.ONBOARDING.LOGIN }],
        });
        return;
      }

      // Check Remember Me status
      // Note: Remember Me is stored in state.security.allowLoginWithRememberMe by SecuritySettings
      const rememberMeEnabled: boolean = yield select(
        selectIsRememberMeEnabled,
      );

      Logger.log(
        `AuthSaga: Remember Me enabled: ${rememberMeEnabled}, hasCredentials: true`,
      );

      if (rememberMeEnabled) {
        // Remember Me enabled - attempt auto-login
        // This will show biometric prompt, then navigate directly to HOME (skipping Login screen)
        Logger.log('AuthSaga: Remember Me enabled, attempting auto-login');
        yield put(actions.attemptRememberMeLogin());
        return; // attemptRememberMeLoginSaga will handle navigation
      }

      // Check if biometric auth is configured
      const authData: Awaited<ReturnType<typeof Authentication.getType>> =
        yield call([Authentication, 'getType']);

      const isBiometricAuth = authData.currentAuthType === 'biometrics';

      Logger.log(
        `AuthSaga: Credentials exist but no auto-login - authType: ${authData.currentAuthType}, isBiometric: ${isBiometricAuth}`,
      );

      yield put(
        actions.initializationComplete({
          hasUser: true,
          isLocked: true,
        }),
      );

      // If biometric auth is configured, trigger biometric BEFORE navigating to Login
      // This shows biometric prompt over FoxLoader for better UX
      if (isBiometricAuth) {
        Logger.log(
          'AuthSaga: Biometric auth configured, triggering biometric prompt on app launch (before showing Login)',
        );

        // PERFORMANCE FIX: Wait for interactions to complete
        // InteractionManager ensures all animations/interactions are done before proceeding
        // Critical for Android release builds with Hermes optimization
        yield call(waitForInteractions);

        // Trigger biometric authentication
        yield put(
          actions.requestAuthentication({
            method: AuthenticationMethod.BIOMETRIC,
            showBiometric: true,
          }),
        );

        // Wait for authentication to complete (success or failure)
        // The requestAuthenticationSaga will handle success (navigate to HOME)
        // or failure/cancellation (we navigate to Login below)
        Logger.log('AuthSaga: Waiting for biometric result...');

        // The saga already navigates on success, so we're done here if it succeeds
        // If it fails/cancels, we continue below to show Login
        return;
      }

      // No biometric - navigate to Login screen
      NavigationService.navigation?.reset({
        index: 0,
        routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked: true } }],
      });
    } catch (error) {
      Logger.error(
        error as Error,
        'AuthSaga: Error checking credentials during init',
      );
      yield put(
        actions.initializationComplete({
          hasUser: true,
          isLocked: true,
        }),
      );
      NavigationService.navigation?.reset({
        index: 0,
        routes: [{ name: Routes.ONBOARDING.LOGIN }],
      });
    }
  } catch (error) {
    Logger.error(
      error as Error,
      'AuthSaga: Critical error during initialization',
    );
    // Fail safe - go to login
    yield put(
      actions.initializationComplete({
        hasUser: true,
        isLocked: true,
      }),
    );
    NavigationService.navigation?.reset({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN }],
    });
  }
}

// ==========================================================================
// Authentication Request Saga
// ==========================================================================

/**
 * Handle authentication request
 * Uses actual Authentication API methods
 */
export function* requestAuthenticationSaga(
  action: PayloadAction<{
    method: AuthenticationMethod;
    password?: string;
    showBiometric?: boolean;
  }>,
) {
  const { method, password, showBiometric } = action.payload;

  try {
    Logger.log(`AuthSaga: Authentication requested with method: ${method}`);

    // Generate bioStateMachineId for this authentication session
    const bioStateMachineId = Date.now().toString();

    let authSuccess: boolean | 'cancelled' = false;

    switch (method) {
      case AuthenticationMethod.PASSWORD:
        if (!password) {
          yield put(
            actions.authenticationFailed({
              method,
              error: 'Password is required',
            }),
          );
          return;
        }
        authSuccess = yield call(
          authenticateWithPassword,
          password,
          bioStateMachineId,
        );
        break;

      case AuthenticationMethod.BIOMETRIC:
        authSuccess = yield call(authenticateWithBiometric, bioStateMachineId);
        break;

      case AuthenticationMethod.DEVICE_PASSCODE:
        authSuccess = yield call(
          authenticateWithDevicePasscode,
          bioStateMachineId,
        );
        break;

      case AuthenticationMethod.REMEMBER_ME:
        authSuccess = yield call(authenticateWithRememberMe, bioStateMachineId);
        break;

      case AuthenticationMethod.APP_TRIGGERED:
        authSuccess = yield call(authenticateAppTriggered, bioStateMachineId);
        break;

      default:
        Logger.error(
          new Error(`Unknown auth method: ${method}`),
          'AuthSaga: Unknown authentication method',
        );
        return;
    }
    Logger.log('AuthSaga: Authentication result:', authSuccess);
    if (authSuccess === true) {
      // Authentication successful
      Logger.log('AuthSaga: Dispatching authenticationSuccess action');
      yield put(
        actions.authenticationSuccess({
          method,
          timestamp: Date.now(),
        }),
      );

      // Check if we should restore previous navigation state (for background/foreground flow)
      // Navigation state from React Navigation is complex and not fully typed
      const savedNavigationState: unknown = yield select(
        selectors.selectNavigationStateBeforeLock,
      );

      Logger.log('AuthSaga: Checking for saved navigation state:', {
        hasSavedState: !!savedNavigationState,
        savedState: JSON.stringify(savedNavigationState),
      });

      if (savedNavigationState) {
        // Restore the full navigation state
        Logger.log('AuthSaga: Restoring navigation state after unlock');

        // Use reset() to restore the full navigation stack
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        NavigationService.navigation?.reset(savedNavigationState as any);

        // Clear the stored state
        yield put(actions.clearNavigationStateBeforeLock());
        Logger.log('AuthSaga: Navigation state restored and cleared');
      } else {
        // No stored state - navigate to HOME (normal flow)
        Logger.log(
          'AuthSaga: No saved navigation state - navigating to HOME_NAV',
        );
        NavigationService.navigation?.navigate(Routes.ONBOARDING.HOME_NAV);
      }
      Logger.log('AuthSaga: Navigation command sent');

      // If biometric was shown and successful, store preference
      if (method === AuthenticationMethod.BIOMETRIC && showBiometric) {
        yield call([StorageWrapper, 'setItem'], BIOMETRY_CHOICE, 'true');
      }
    } else if (authSuccess === 'cancelled') {
      // User cancelled biometric
      Logger.log('AuthSaga: Biometric cancelled, navigating to login screen');
      // Don't dispatch authenticationFailed, don't increment failed attempts

      // Navigate to Login so user can enter password
      const currentRoute =
        NavigationService.navigation?.getCurrentRoute?.()?.name;
      if (currentRoute !== Routes.ONBOARDING.LOGIN) {
        NavigationService.navigation?.reset({
          index: 0,
          routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked: true } }],
        });
      }
      return; // Exit saga early
    } else {
      // Authentication failed
      yield put(
        actions.authenticationFailed({
          method,
          error: 'Authentication failed',
        }),
      );

      // Navigate to Login for retry
      const currentRoute =
        NavigationService.navigation?.getCurrentRoute?.()?.name;
      if (currentRoute !== Routes.ONBOARDING.LOGIN) {
        NavigationService.navigation?.reset({
          index: 0,
          routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked: true } }],
        });
      }
    }
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Error during authentication');
    yield put(
      actions.authenticationFailed({
        method,
        error: (error as Error).message,
      }),
    );
  }
}

// ==========================================================================
// Authentication Methods - Using Actual API
// ==========================================================================

/**
 * Authenticate with password
 * Uses Authentication.userEntryAuth() - the actual API method
 */
function* authenticateWithPassword(
  password: string,
  _bioStateMachineId: string,
) {
  try {
    // Get authentication type using actual API method
    const authData: Awaited<ReturnType<typeof Authentication.getType>> =
      yield call([Authentication, 'getType']);

    // Call actual API method: userEntryAuth
    // This internally:
    // - Calls KeyringController.submitPassword(password)
    // - Dispatches logIn() Redux action
    // - Dispatches passwordSet() Redux action
    yield call([Authentication, 'userEntryAuth'], password, authData);

    return true;
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Password authentication failed');
    return false;
  }
}

/**
 * Authenticate with biometric
 * Uses Authentication.appTriggeredAuth() - the actual API method
 * @returns true on success, 'cancelled' if user cancelled, false on error
 */
function* authenticateWithBiometric(bioStateMachineId: string) {
  try {
    // Start the biometric authentication (non-blocking)
    const authPromise = call([Authentication, 'appTriggeredAuth'], {
      bioStateMachineId,
      disableAutoLogout: false,
    });

    // Race between auth completing and timeout
    const raceResult: {
      auth?: unknown;
      timeout?: boolean;
      authSuccess?: unknown;
      authError?: unknown;
    } = yield race({
      auth: authPromise,
      timeout: delay(BIOMETRIC_TIMEOUT),
      // Also listen for authSuccess/authError actions in case auth completes very fast
      authSuccess: take(
        (action: { type: string; payload?: { bioStateMachineId?: string } }) =>
          action.type === UserActionType.AUTH_SUCCESS &&
          action.payload?.bioStateMachineId === bioStateMachineId,
      ),
      authError: take(
        (action: { type: string; payload?: { bioStateMachineId?: string } }) =>
          action.type === UserActionType.AUTH_ERROR &&
          action.payload?.bioStateMachineId === bioStateMachineId,
      ),
    });

    Logger.log('AuthSaga: Race result:', {
      hasAuth: !!raceResult.auth,
      hasTimeout: !!raceResult.timeout,
      hasAuthSuccess: !!raceResult.authSuccess,
      hasAuthError: !!raceResult.authError,
    });

    if (raceResult.timeout) {
      Logger.log('AuthSaga: Biometric authentication timed out');
      return false;
    }

    if (raceResult.authError) {
      Logger.log('AuthSaga: Received AUTH_ERROR action');
      return false;
    }

    if (raceResult.authSuccess || raceResult.auth) {
      Logger.log(
        'AuthSaga: Biometric authentication succeeded - returning true',
      );
      return true;
    }

    Logger.log('AuthSaga: No matching race result - returning false');
    return false;
  } catch (error) {
    // Use utility to detect user cancellation
    if (isUserCancellation(error)) {
      Logger.log('AuthSaga: Biometric authentication cancelled by user');
      return 'cancelled' as const;
    }

    Logger.error(error as Error, 'AuthSaga: Biometric authentication failed');
    return false;
  }
}

/**
 * Authenticate with device passcode
 * Uses Authentication.appTriggeredAuth() with passcode type
 */
function* authenticateWithDevicePasscode(bioStateMachineId: string) {
  try {
    yield call([Authentication, 'appTriggeredAuth'], {
      bioStateMachineId,
      disableAutoLogout: false,
    });
    return true;
  } catch (error) {
    Logger.error(
      error as Error,
      'AuthSaga: Device passcode authentication failed',
    );
    return false;
  }
}

/**
 * Authenticate with Remember Me
 * Uses Authentication.appTriggeredAuth()
 */
function* authenticateWithRememberMe(bioStateMachineId: string) {
  try {
    yield call([Authentication, 'appTriggeredAuth'], {
      bioStateMachineId,
      disableAutoLogout: false,
    });
    return true;
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Remember Me login failed');
    return false;
  }
}

/**
 * App-triggered authentication (automatic)
 * Uses Authentication.appTriggeredAuth()
 */
function* authenticateAppTriggered(bioStateMachineId: string) {
  try {
    yield call([Authentication, 'appTriggeredAuth'], {
      bioStateMachineId,
      disableAutoLogout: false,
    });
    return true;
  } catch (error) {
    Logger.error(
      error as Error,
      'AuthSaga: App-triggered authentication failed',
    );
    return false;
  }
}

// ==========================================================================
// Remember Me Saga
// ==========================================================================

/**
 * Attempt Remember Me auto-login
 * Remember Me = No authentication prompt, direct unlock
 * Password must be stored with REMEMBER_ME type (no biometric protection)
 */
export function* attemptRememberMeLoginSaga() {
  try {
    Logger.log('AuthSaga: Remember Me enabled - auto-unlocking without prompt');

    // Check current auth type first
    const authData: Awaited<ReturnType<typeof Authentication.getType>> =
      yield call([Authentication, 'getType']);

    Logger.log(`AuthSaga: Current auth type: ${authData.currentAuthType}`);

    // Get stored password (should be stored with REMEMBER_ME type = no biometric prompt)
    let credentials: { password: string } | false | null;
    try {
      credentials = yield call([Authentication, 'getPassword']);
    } catch (getPasswordError) {
      // Use utility to detect user cancellation
      if (isUserCancellation(getPasswordError)) {
        Logger.log(
          'AuthSaga: User cancelled biometric during Remember Me - showing login',
        );
      } else {
        Logger.error(
          getPasswordError as Error,
          'AuthSaga: Error getting password for Remember Me',
        );
      }

      // Navigate to Login screen so user can enter password
      yield put(
        actions.initializationComplete({
          hasUser: true,
          isLocked: true,
        }),
      );
      NavigationService.navigation?.reset({
        index: 0,
        routes: [{ name: Routes.ONBOARDING.LOGIN }],
      });
      return;
    }

    Logger.log(`AuthSaga: Got credentials: ${!!credentials}`);

    if (
      !credentials ||
      typeof credentials !== 'object' ||
      !credentials.password
    ) {
      // No credentials - show login
      Logger.log('AuthSaga: No credentials for Remember Me, showing login');
      yield put(
        actions.initializationComplete({
          hasUser: true,
          isLocked: true,
        }),
      );
      NavigationService.navigation?.reset({
        index: 0,
        routes: [{ name: Routes.ONBOARDING.LOGIN }],
      });
      return;
    }

    // Unlock KeyringController directly (no biometric prompt)
    const { KeyringController } = Engine.context;
    yield call([KeyringController, 'submitPassword'], credentials.password);

    // Initialize account services (AccountTreeInitService, MultichainAccountService)
    // and dispatch LOGIN action
    yield call([Authentication, 'dispatchLogin'], {
      clearAccountTreeState: false,
    });

    // Update authentication state
    yield put(
      actions.authenticationSuccess({
        method: AuthenticationMethod.REMEMBER_ME,
        timestamp: Date.now(),
      }),
    );
    yield put(
      actions.initializationComplete({
        hasUser: true,
        isLocked: false,
      }),
    );

    // Navigate directly to HOME (no Login screen)
    NavigationService.navigation?.reset({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });

    // Run post-login operations in background (re-sync, discovery)
    // NOTE: We do not await on purpose, to run those operations in the background.
    // This matches the behavior in userEntryAuth
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Authentication.postLoginAsyncOperations();

    Logger.log('AuthSaga: Remember Me auto-login successful');
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Remember Me login failed');
    yield put(
      actions.initializationComplete({
        hasUser: true,
        isLocked: true,
      }),
    );
    NavigationService.navigation?.reset({
      index: 0,
      routes: [{ name: Routes.ONBOARDING.LOGIN }],
    });
  }
}

// ==========================================================================
// Lock/Unlock Sagas
// ==========================================================================

/**
 * Lock the app
 * Uses Authentication.lockApp() - the actual API method
 */
export function* lockAppSaga(
  action: PayloadAction<{ shouldNavigate?: boolean }>,
) {
  try {
    const { shouldNavigate = true } = action.payload;

    Logger.log('AuthSaga: Locking app (manual lock)');

    // Call Authentication API to lock
    // Note: Authentication.lockApp handles navigation internally if navigateToLogin = true
    yield call([Authentication, 'lockApp'], {
      reset: false,
      locked: true,
      navigateToLogin: shouldNavigate,
    });

    // Clear any active lock timer
    yield call([AppStateService, 'clearLockTimer']);

    // Clear any stored navigation state - manual locks should not restore previous screen
    yield put(actions.clearNavigationStateBeforeLock());

    // Update state
    yield put(actions.appLocked({ shouldNavigate }));
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Error locking app');
    yield put(
      actions.authenticationError({
        error: (error as Error).message,
        context: 'lock_app',
      }),
    );
  }
}

// ==========================================================================
// Background Timer Sagas
// ==========================================================================

/**
 * App backgrounded - start lock timer using AppStateService
 */
export function* appBackgroundedSaga() {
  try {
    // Debug: Check current authentication state
    const currentState: AuthenticationState = yield select(
      selectors.selectCurrentAuthState,
    );
    const isAuthenticated: boolean = yield select(
      selectors.selectIsAuthenticated,
    );

    Logger.log(
      `AuthSaga: App backgrounded - currentState: ${currentState}, isAuthenticated: ${isAuthenticated}`,
    );

    if (!isAuthenticated) {
      Logger.log('AuthSaga: App backgrounded but not authenticated, skipping');
      return;
    }

    const rememberMeEnabled: boolean = yield select(selectIsRememberMeEnabled);

    if (rememberMeEnabled) {
      Logger.log('AuthSaga: Remember Me enabled, skipping background lock');
      return;
    }

    // Save full navigation state for restoration after unlock
    // This allows users to return to where they were before backgrounding
    const navRef = NavigationService.navigation;
    const currentRoute = navRef?.getCurrentRoute?.()?.name;

    // Try to get navigation state using getRootState (correct React Navigation API)
    let navigationState: unknown;
    try {
      navigationState = (
        navRef as unknown as { getRootState: () => unknown }
      )?.getRootState?.();
    } catch (error) {
      Logger.error(error as Error, 'AuthSaga: Error getting navigation state');
    }

    if (
      navigationState &&
      currentRoute &&
      currentRoute !== Routes.ONBOARDING.LOGIN
    ) {
      Logger.log(
        `AuthSaga: ✅ Saving navigation state before lock - current route: ${currentRoute}`,
      );
      yield put(actions.saveNavigationStateBeforeLock(navigationState));
    } else {
      Logger.log(
        'AuthSaga: NOT saving navigation state - conditions not met:',
        {
          hasNavigationState: !!navigationState,
          hasCurrentRoute: !!currentRoute,
          isNotLogin: currentRoute !== Routes.ONBOARDING.LOGIN,
        },
      );
    }

    // Get lock timer duration from settings using selector
    const lockTime: number = yield select(selectors.selectLockTime);

    // Handle lock time values:
    // -1 = Auto-lock disabled (never lock)
    // 0 = Immediate lock (lock right away, no timer)
    // > 0 = Lock after specified milliseconds

    if (lockTime === -1) {
      Logger.log(
        'AuthSaga: Auto-lock disabled (lockTime = -1), skipping timer',
      );
      return;
    }

    Logger.log(
      'AuthSaga: App backgrounded, starting lock timer via AppStateService',
    );

    if (lockTime === 0) {
      // Immediate lock - don't start timer, lock right away
      Logger.log('AuthSaga: Immediate lock (lockTime = 0), locking now');
      yield call([Authentication, 'lockApp'], {
        reset: false,
        locked: true,
        navigateToLogin: false,
      });
      yield put(lockAppAction());
      yield put(
        actions.appLocked({
          shouldNavigate: false,
        }),
      );
      return;
    }

    // Use actual lock time from settings (don't default if it's explicitly set)
    // NOTE: If you refactor this later, remember lockTime comes from state.settings.lockTime
    const duration = lockTime > 0 ? lockTime : DEFAULT_LOCK_TIMER_DURATION;

    // Start lock timer using AppStateService
    // When timer expires, it will trigger the callback
    yield call([AppStateService, 'startLockTimer'], duration, () => {
      // Timer expired - dispatch action to lock app
      // Note: Can't use 'yield' in callback, using direct Redux dispatch
      ReduxService.store.dispatch(actions.backgroundTimerExpired());
    });

    Logger.log(
      `AuthSaga: Lock timer started for ${duration}ms via AppStateService (from state.settings.lockTime)`,
    );
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Error handling app backgrounded');
  }
}

/**
 * App foregrounded - check if should lock
 */
export function* appForegroundedSaga() {
  try {
    Logger.log('AuthSaga: App foregrounded');

    // Check if timer is still active
    const isTimerActive: boolean = yield call([
      AppStateService,
      'isLockTimerActive',
    ]);

    if (isTimerActive) {
      // Clear the timer - user returned before it expired
      yield call([AppStateService, 'clearLockTimer']);
      Logger.log('AuthSaga: Lock timer cleared - user returned in time');
    }

    // Check current state
    const currentState: AuthenticationState = yield select(
      selectors.selectCurrentAuthState,
    );

    if (currentState === AuthenticationState.LOCKED) {
      // App was locked - check if biometric auth is configured
      const authData: Awaited<ReturnType<typeof Authentication.getType>> =
        yield call([Authentication, 'getType']);
      const isBiometricAuth = authData.currentAuthType === 'biometrics';

      // Ensure we're on login screen
      const currentRoute =
        NavigationService.navigation?.getCurrentRoute?.()?.name;
      if (currentRoute !== Routes.ONBOARDING.LOGIN) {
        NavigationService.navigation?.reset({
          index: 0,
          routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked: true } }],
        });

        // Performance fix
        // On Android release builds, this ensures the BiometricPrompt API has a ready Activity context
        // Critical for Hermes bytecode optimizations that execute code very quickly
        yield call(waitForInteractions);
      }

      // If biometric auth is configured, trigger biometric authentication
      if (isBiometricAuth) {
        Logger.log(
          'AuthSaga: App returned from background and is locked - triggering biometric',
        );
        yield put(
          actions.requestAuthentication({
            method: AuthenticationMethod.BIOMETRIC,
            showBiometric: true,
          }),
        );
      }
    }
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Error handling app foregrounded');
  }
}

/**
 * Background timer expired
 */
export function* backgroundTimerExpiredSaga() {
  try {
    Logger.log('AuthSaga: Background timer expired - locking app');

    // Lock the app via Authentication API
    yield call([Authentication, 'lockApp'], {
      reset: false,
      locked: true,
      navigateToLogin: false, // Don't navigate - app is in background
    });

    // Dispatch LOCKED_APP action for other systems
    yield put(lockAppAction());

    // Update new state
    yield put(
      actions.appLocked({
        shouldNavigate: false,
      }),
    );
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Error handling timer expiration');
  }
}

/**
 * Watch for AppStateService events
 * This saga listens to AppStateService and dispatches appropriate actions
 */
function* watchAppStateServiceSaga(): Generator<
  unknown,
  void,
  | EventChannel<{ type: string; state?: string }>
  | { type: string; state?: string }
  | boolean
> {
  let channel: EventChannel<{ type: string; state?: string }> | undefined;

  try {
    // Create proper event channel
    channel = (yield call(createAppStateChannel)) as
      | EventChannel<{
          type: string;
          state?: string;
        }>
      | undefined;

    if (!channel) {
      Logger.error(
        new Error('Failed to create AppState channel'),
        'AuthSaga: Channel creation failed',
      );
      return;
    }

    while (true) {
      const event = (yield take(channel)) as { type: string; state?: string };

      switch (event.type) {
        case 'background':
          yield put(actions.appBackgrounded());
          break;
        case 'foreground':
          yield put(actions.appForegrounded());
          break;
        default:
          break;
      }
    }
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Error in AppState watcher');
  } finally {
    const isCancelled = (yield cancelled()) as boolean;
    if (isCancelled && channel) {
      Logger.log('AuthSaga: AppState watcher cancelled');
      channel.close();
    }
  }
}

/**
 * Create proper event channel for AppStateService events
 * Uses redux-saga eventChannel pattern
 */
function createAppStateChannel(): EventChannel<{
  type: string;
  state?: string;
}> {
  return eventChannel((emitter) => {
    const onBackground = (state?: string) => {
      emitter({ type: 'background', state });
    };

    const onForeground = (state?: string) => {
      emitter({ type: 'foreground', state });
    };

    // Subscribe to AppStateService events
    AppStateService.on('background', onBackground);
    AppStateService.on('foreground', onForeground);

    // Return unsubscribe function (required by eventChannel)
    return () => {
      AppStateService.off('background', onBackground);
      AppStateService.off('foreground', onForeground);
    };
  });
}

// ==========================================================================
// Biometric Sagas
// ==========================================================================

/**
 * Check biometric availability
 * Uses SecureKeychain directly - actual API method
 */
export function* checkBiometricAvailabilitySaga() {
  try {
    // Use actual SecureKeychain method
    const biometryType: string | null = yield call([
      SecureKeychain,
      'getSupportedBiometryType',
    ]);

    const available = !!biometryType;

    yield put(
      actions.biometricAvailabilityChecked({
        available,
        biometryType: biometryType || undefined,
      }),
    );

    Logger.log(
      `AuthSaga: Biometric available: ${available}, type: ${biometryType}`,
    );
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Error checking biometric');
    yield put(
      actions.biometricAvailabilityChecked({
        available: false,
        error: (error as Error).message,
      }),
    );
  }
}

// ==========================================================================
// Logout Saga
// ==========================================================================

/**
 * Handle user logout
 * Note: Authentication.lockApp with reset=true handles logout
 */
export function* logoutSaga() {
  try {
    Logger.log('AuthSaga: Logging out');

    // Call Authentication API to logout
    // Authentication.lockApp with reset=true clears the vault
    yield call([Authentication, 'lockApp'], {
      reset: true, // Reset vault on logout
      locked: true,
      navigateToLogin: true,
    });

    // Clear lock timer
    yield call([AppStateService, 'clearLockTimer']);

    // Clear any stored navigation state
    yield put(actions.clearNavigationStateBeforeLock());

    // Update state
    yield put(actions.logoutComplete());

    // Navigation is handled by Authentication.lockApp
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Error during logout');
    yield put(
      actions.authenticationError({
        error: (error as Error).message,
        context: 'logout',
      }),
    );
  }
}

// ==========================================================================
// Navigation Sagas
// ==========================================================================

// ==========================================================================
// Authentication Lifecycle Management (Using AppStateService)
// ==========================================================================

/**
 * Manage authentication lifecycle
 * Replaces the old authStateMachine
 * Uses AppStateService for background timer management
 */
function* manageAuthenticationLifecycleSaga() {
  while (true) {
    try {
      // Wait for LOGIN action (dispatched by Authentication.userEntryAuth)
      yield take(UserActionType.LOGIN);

      Logger.log(
        'AuthSaga: User logged in, starting authentication management',
      );

      // Check for saved navigation state (for background/foreground restoration flow)
      const savedNavigationState: unknown = yield select(
        selectors.selectNavigationStateBeforeLock,
      );

      Logger.log('AuthSaga: Checking for saved navigation state after LOGIN:', {
        hasSavedState: !!savedNavigationState,
      });

      if (savedNavigationState) {
        // Restore the full navigation state (background/foreground restoration)
        // This takes precedence over component navigation
        Logger.log('AuthSaga: Restoring saved navigation state after LOGIN');

        // Use reset() to restore the full navigation stack
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        NavigationService.navigation?.reset(savedNavigationState as any);

        // Clear the stored state
        yield put(actions.clearNavigationStateBeforeLock());
        Logger.log(
          'AuthSaga: Navigation state restored and cleared after LOGIN',
        );
      } else {
        // No saved state - component will handle navigation for normal login flow
        Logger.log(
          'AuthSaga: No saved navigation state after LOGIN - component will handle navigation',
        );
      }

      // Update state
      yield put(
        actions.authenticationSuccess({
          method: AuthenticationMethod.PASSWORD,
          timestamp: Date.now(),
        }),
      );

      // Debug: Verify state was updated
      const newState: AuthenticationState = yield select(
        selectors.selectCurrentAuthState,
      );
      Logger.log(`AuthSaga: State after LOGIN - currentState: ${newState}`);

      // NOTE: handleAppLockSaga removed - manual locks now handled by appForegroundedSaga
      // Manual lock flow:
      // 1. User presses Lock in Settings → dispatches LOCKED_APP
      // 2. Authentication.lockApp() already navigates to Login
      // 3. When user returns (app foregrounds), appForegroundedSaga checks if locked and triggers biometric

      // Wait for LOGOUT
      yield take(UserActionType.LOGOUT);

      Logger.log('AuthSaga: User logged out, cleaning up');

      // Update state
      yield put(actions.logoutComplete());

      // Clear any active timers
      yield call([AppStateService, 'clearLockTimer']);
    } catch (error) {
      Logger.error(
        error as Error,
        'AuthSaga: Error in authentication lifecycle',
      );
    }
  }
}

// ==========================================================================
// NOTE: handleAppLockSaga, handleBiometricsSaga, and lockKeyringAndAppSaga REMOVED
// These old sagas are no longer needed because:
// 1. LockScreen component is deprecated - we use Login for everything
// 2. All biometric triggering now happens in appForegroundedSaga and initializeAuthenticationSaga
// 3. Manual locks are handled by:
//    - Authentication.lockApp() navigates to Login
//    - appForegroundedSaga detects locked state and triggers biometric if configured
// 4. Background timer locks are handled by:
//    - backgroundTimerExpiredSaga locks the app
//    - appForegroundedSaga detects locked state and triggers biometric if configured
// ==========================================================================

// ==========================================================================
// Root Saga - Watcher
// ==========================================================================

/**
 * Root Authentication Saga
 * Watches for all authentication actions and dispatches to appropriate handlers
 *
 * This saga REPLACES the old authStateMachine, appLockStateMachine, and biometricsStateMachine
 * Uses AppStateService for background timer management (replaces LockManagerService)
 */
export function* authenticationSaga() {
  try {
    Logger.log(
      'AuthSaga: Starting authentication saga - Using AppStateService for timers',
    );

    // Fork authentication lifecycle (REPLACES authStateMachine)
    // Manages LOGIN/LOGOUT cycle
    yield fork(manageAuthenticationLifecycleSaga);

    // Fork app state watcher (Uses AppStateService, NOT LockManagerService)
    yield fork(watchAppStateServiceSaga);

    // Listen to authentication actions
    yield takeLatest(
      actions.initializeAuthentication.type,
      initializeAuthenticationSaga,
    );
    yield takeLatest(
      actions.requestAuthentication.type,
      requestAuthenticationSaga,
    );
    yield takeLatest(
      actions.attemptRememberMeLogin.type,
      attemptRememberMeLoginSaga,
    );
    yield takeLatest(actions.lockApp.type, lockAppSaga);
    yield takeLatest(actions.appBackgrounded.type, appBackgroundedSaga);
    yield takeLatest(actions.appForegrounded.type, appForegroundedSaga);
    yield takeLatest(
      actions.backgroundTimerExpired.type,
      backgroundTimerExpiredSaga,
    );
    yield takeLatest(
      actions.checkBiometricAvailability.type,
      checkBiometricAvailabilitySaga,
    );
    yield takeLatest(actions.logout.type, logoutSaga);

    Logger.log(
      'AuthSaga: All watchers initialized - ready to handle authentication',
    );
  } catch (error) {
    Logger.error(error as Error, 'AuthSaga: Critical error in root saga');
  }
}
