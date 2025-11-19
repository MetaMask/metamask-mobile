/**
 * Authentication Slice
 *
 * Redux Toolkit slice for authentication state management.
 * Consolidates types, actions, and reducer using createSlice pattern.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import { createSelector } from 'reselect';

// ==========================================================================
// Types
// ==========================================================================

/**
 * Authentication States
 */
export enum AuthenticationState {
  INITIALIZING = 'INITIALIZING',
  AUTHENTICATED = 'AUTHENTICATED',
  LOCKED = 'LOCKED',
  AUTHENTICATING = 'AUTHENTICATING',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  MAX_ATTEMPTS_REACHED = 'MAX_ATTEMPTS_REACHED',
  BACKGROUND_TIMER_ACTIVE = 'BACKGROUND_TIMER_ACTIVE',
  LOGGING_OUT = 'LOGGING_OUT',
  NO_USER = 'NO_USER',
}

/**
 * Authentication Methods
 */
export enum AuthenticationMethod {
  PASSWORD = 'PASSWORD',
  BIOMETRIC = 'BIOMETRIC',
  DEVICE_PASSCODE = 'DEVICE_PASSCODE',
  REMEMBER_ME = 'REMEMBER_ME',
  APP_TRIGGERED = 'APP_TRIGGERED',
}

/**
 * Authentication Context
 */
export interface AuthenticationContext {
  failedAttempts: number;
  maxAttempts: number;
  biometricAvailable: boolean;
  devicePasscodeAvailable: boolean;
  rememberMeEnabled: boolean;
  lastAuthenticationTime?: number;
  error?: string;
  isFirstTimeUser: boolean;
  shouldShowBiometric: boolean;
}

/**
 * Authentication State
 */
export interface AuthenticationSliceState {
  currentState: AuthenticationState;
  previousState?: AuthenticationState;
  context: AuthenticationContext;
  stateChangedAt: number;
}

/**
 * Payload Types
 */
export interface AuthenticationSuccessPayload {
  method: AuthenticationMethod;
  timestamp: number;
}

export interface AuthenticationFailurePayload {
  method: AuthenticationMethod;
  error: string;
  attemptNumber: number;
}

export interface LockAppPayload {
  shouldNavigate?: boolean;
}

export interface BiometricCheckResult {
  available: boolean;
  biometryType?: string;
  error?: string;
}

export interface RequestAuthenticationPayload {
  method: AuthenticationMethod;
  password?: string;
  showBiometric?: boolean;
  skipMaxAttemptsCheck?: boolean;
}

export interface InitializationCompletePayload {
  hasUser: boolean;
  isLocked: boolean;
}

// ==========================================================================
// Initial State
// ==========================================================================

const initialState: AuthenticationSliceState = {
  currentState: AuthenticationState.INITIALIZING,
  previousState: undefined,
  context: {
    failedAttempts: 0,
    maxAttempts: 5,
    biometricAvailable: false,
    devicePasscodeAvailable: false,
    rememberMeEnabled: false,
    isFirstTimeUser: false,
    shouldShowBiometric: false,
  },
  stateChangedAt: Date.now(),
};

// ==========================================================================
// Slice
// ==========================================================================

const authenticationSlice = createSlice({
  name: 'authentication',
  initialState,
  reducers: {
    // Initialization
    initializeAuthentication: (state) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.INITIALIZING;
      state.stateChangedAt = Date.now();
    },
    initializationComplete: (
      state,
      action: PayloadAction<InitializationCompletePayload>,
    ) => {
      const { hasUser, isLocked } = action.payload;
      state.context.isFirstTimeUser = !hasUser;
      state.previousState = state.currentState;

      if (!hasUser) {
        state.currentState = AuthenticationState.NO_USER;
      } else if (isLocked) {
        state.currentState = AuthenticationState.LOCKED;
      } else {
        state.currentState = AuthenticationState.AUTHENTICATED;
      }
      state.stateChangedAt = Date.now();
    },

    // Authentication
    requestAuthentication: (
      state,
      _action: PayloadAction<RequestAuthenticationPayload>,
    ) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.AUTHENTICATING;
      state.context.error = undefined;
      state.stateChangedAt = Date.now();
    },
    authenticationSuccess: (
      state,
      action: PayloadAction<AuthenticationSuccessPayload>,
    ) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.AUTHENTICATED;
      state.context.failedAttempts = 0;
      state.context.lastAuthenticationTime = action.payload.timestamp;
      state.context.error = undefined;
      state.stateChangedAt = Date.now();
    },
    authenticationFailed: (
      state,
      action: PayloadAction<AuthenticationFailurePayload>,
    ) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.AUTHENTICATION_FAILED;
      state.context.failedAttempts = action.payload.attemptNumber;
      state.context.error = action.payload.error;
      state.stateChangedAt = Date.now();

      if (state.context.failedAttempts >= state.context.maxAttempts) {
        state.currentState = AuthenticationState.MAX_ATTEMPTS_REACHED;
      }
    },
    resetFailedAttempts: (state) => {
      state.context.failedAttempts = 0;
      state.context.error = undefined;
    },

    // Lock/Unlock
    lockApp: () => {
      // Handled by saga
    },
    appLocked: (state, _action: PayloadAction<LockAppPayload>) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.LOCKED;
      state.context.error = undefined;
      state.stateChangedAt = Date.now();
    },
    unlockApp: (state) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.LOCKED;
    },
    appUnlocked: (state) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.AUTHENTICATED;
      state.context.failedAttempts = 0;
      state.context.error = undefined;
      state.stateChangedAt = Date.now();
    },

    // Biometric
    checkBiometricAvailability: () => {
      // Handled by saga
    },
    biometricAvailabilityChecked: (
      state,
      action: PayloadAction<BiometricCheckResult>,
    ) => {
      state.context.biometricAvailable = action.payload.available;
      state.context.shouldShowBiometric =
        action.payload.available && state.context.rememberMeEnabled;
    },
    triggerBiometricAuthentication: (state) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.AUTHENTICATING;
      state.stateChangedAt = Date.now();
    },

    // Background Timer
    appBackgrounded: (state) => {
      if (state.currentState === AuthenticationState.AUTHENTICATED) {
        state.previousState = state.currentState;
        state.currentState = AuthenticationState.BACKGROUND_TIMER_ACTIVE;
        state.stateChangedAt = Date.now();
      }
    },
    appForegrounded: () => {
      // Handled by saga
    },
    backgroundTimerExpired: (state) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.LOCKED;
      state.stateChangedAt = Date.now();
    },

    // Remember Me
    setRememberMe: (state, action: PayloadAction<boolean>) => {
      state.context.rememberMeEnabled = action.payload;
      state.context.shouldShowBiometric =
        action.payload && state.context.biometricAvailable;
    },
    attemptRememberMeLogin: (state) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.AUTHENTICATING;
      state.stateChangedAt = Date.now();
    },

    // Logout
    logout: (state) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.LOGGING_OUT;
      state.stateChangedAt = Date.now();
    },
    logoutComplete: (state) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.LOCKED;
      state.context.failedAttempts = 0;
      state.context.lastAuthenticationTime = undefined;
      state.stateChangedAt = Date.now();
    },

    // Max Attempts
    maxAttemptsReached: (state) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.MAX_ATTEMPTS_REACHED;
      state.stateChangedAt = Date.now();
    },
    clearMaxAttemptsLockout: (state) => {
      state.previousState = state.currentState;
      state.currentState = AuthenticationState.LOCKED;
      state.context.failedAttempts = 0;
      state.context.error = undefined;
      state.stateChangedAt = Date.now();
    },

    // Navigation (handled by saga)
    navigateToLogin: () => {
      // Handled by saga
    },
    navigateToHome: () => {
      // Handled by saga
    },

    // Errors
    authenticationError: (
      state,
      action: PayloadAction<{ error: string; context?: string }>,
    ) => {
      state.context.error = action.payload.error;
    },
  },
});

// ==========================================================================
// Exports
// ==========================================================================

export const {
  initializeAuthentication,
  initializationComplete,
  requestAuthentication,
  authenticationSuccess,
  authenticationFailed,
  resetFailedAttempts,
  lockApp,
  appLocked,
  unlockApp,
  appUnlocked,
  checkBiometricAvailability,
  biometricAvailabilityChecked,
  triggerBiometricAuthentication,
  appBackgrounded,
  appForegrounded,
  backgroundTimerExpired,
  setRememberMe,
  attemptRememberMeLogin,
  logout,
  logoutComplete,
  maxAttemptsReached,
  clearMaxAttemptsLockout,
  navigateToLogin,
  navigateToHome,
  authenticationError,
} = authenticationSlice.actions;

export default authenticationSlice.reducer;

// ==========================================================================
// Selectors
// ==========================================================================

export const selectAuthenticationState = (state: RootState) =>
  state.authentication;

export const selectCurrentAuthState = createSelector(
  selectAuthenticationState,
  (auth) => auth.currentState,
);

export const selectPreviousAuthState = createSelector(
  selectAuthenticationState,
  (auth) => auth.previousState,
);

export const selectAuthContext = createSelector(
  selectAuthenticationState,
  (auth) => auth.context,
);

export const selectIsAuthenticated = createSelector(
  selectCurrentAuthState,
  (state) =>
    state === AuthenticationState.AUTHENTICATED ||
    state === AuthenticationState.BACKGROUND_TIMER_ACTIVE,
);

export const selectIsLocked = createSelector(
  selectCurrentAuthState,
  (state) =>
    state === AuthenticationState.LOCKED ||
    state === AuthenticationState.AUTHENTICATION_FAILED ||
    state === AuthenticationState.MAX_ATTEMPTS_REACHED,
);

export const selectIsAuthenticating = createSelector(
  selectCurrentAuthState,
  (state) => state === AuthenticationState.AUTHENTICATING,
);

export const selectIsInitializing = createSelector(
  selectCurrentAuthState,
  (state) => state === AuthenticationState.INITIALIZING,
);

export const selectIsFirstTimeUser = createSelector(
  selectAuthContext,
  (context) => context.isFirstTimeUser,
);

export const selectHasMaxAttemptsReached = createSelector(
  selectCurrentAuthState,
  (state) => state === AuthenticationState.MAX_ATTEMPTS_REACHED,
);

export const selectIsBackgroundTimerActive = createSelector(
  selectCurrentAuthState,
  (state) => state === AuthenticationState.BACKGROUND_TIMER_ACTIVE,
);

export const selectFailedAttempts = createSelector(
  selectAuthContext,
  (context) => context.failedAttempts,
);

export const selectMaxAttempts = createSelector(
  selectAuthContext,
  (context) => context.maxAttempts,
);

export const selectRemainingAttempts = createSelector(
  selectFailedAttempts,
  selectMaxAttempts,
  (failed, max) => Math.max(0, max - failed),
);

export const selectIsBiometricAvailable = createSelector(
  selectAuthContext,
  (context) => context.biometricAvailable,
);

export const selectIsDevicePasscodeAvailable = createSelector(
  selectAuthContext,
  (context) => context.devicePasscodeAvailable,
);

/**
 * Select Remember Me setting
 * Note: Remember Me is stored in state.security.allowLoginWithRememberMe by SecuritySettings
 * This selector provides access to it from the authentication module
 */
export const selectIsRememberMeEnabled = (state: RootState) =>
  state.security.allowLoginWithRememberMe;

export const selectShouldShowBiometric = createSelector(
  selectAuthContext,
  (context) => context.shouldShowBiometric,
);

/**
 * Select lock time from settings
 * Note: Lock time is stored in state.settings.lockTime, not in authentication state
 * This selector provides a centralized way to access it
 */
export const selectLockTime = (state: RootState) => state.settings.lockTime;

export const selectLastAuthenticationTime = createSelector(
  selectAuthContext,
  (context) => context.lastAuthenticationTime,
);

export const selectAuthError = createSelector(
  selectAuthContext,
  (context) => context.error,
);

export const selectStateChangedAt = createSelector(
  selectAuthenticationState,
  (auth) => auth.stateChangedAt,
);

export const selectShouldShowLogin = createSelector(
  selectCurrentAuthState,
  selectIsFirstTimeUser,
  (state, isFirstTime) =>
    !isFirstTime &&
    (state === AuthenticationState.LOCKED ||
      state === AuthenticationState.AUTHENTICATION_FAILED ||
      state === AuthenticationState.MAX_ATTEMPTS_REACHED),
);

export const selectCanAttemptAuth = createSelector(
  selectCurrentAuthState,
  selectHasMaxAttemptsReached,
  (state, maxReached) =>
    !maxReached &&
    (state === AuthenticationState.LOCKED ||
      state === AuthenticationState.AUTHENTICATION_FAILED),
);

export const selectAuthStateSummary = createSelector(
  selectCurrentAuthState,
  selectPreviousAuthState,
  selectAuthContext,
  selectStateChangedAt,
  (current, previous, context, changedAt) => ({
    current,
    previous,
    isAuthenticated:
      current === AuthenticationState.AUTHENTICATED ||
      current === AuthenticationState.BACKGROUND_TIMER_ACTIVE,
    isLocked:
      current === AuthenticationState.LOCKED ||
      current === AuthenticationState.AUTHENTICATION_FAILED ||
      current === AuthenticationState.MAX_ATTEMPTS_REACHED,
    failedAttempts: context.failedAttempts,
    maxAttempts: context.maxAttempts,
    biometricAvailable: context.biometricAvailable,
    rememberMeEnabled: context.rememberMeEnabled,
    error: context.error,
    stateChangedAt: changedAt,
  }),
);
