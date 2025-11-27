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
}

/**
 * Authentication Context
 */
export interface AuthenticationContext {
  biometricAvailable: boolean;
  devicePasscodeAvailable: boolean;
  rememberMeEnabled: boolean;
  lastAuthenticationTime?: number;
  error?: string;
  isFirstTimeUser: boolean;
  shouldShowBiometric: boolean;
  navigationStateBeforeLock?: unknown;
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
}

export interface InitializationCompletePayload {
  hasUser: boolean;
  isLocked: boolean;
}

// ==========================================================================
// Initial State
// ==========================================================================

export const initialState: AuthenticationSliceState = {
  currentState: AuthenticationState.INITIALIZING,
  previousState: undefined,
  context: {
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
      state.context.error = action.payload.error;
      state.stateChangedAt = Date.now();
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

    // Route Restoration
    saveNavigationStateBeforeLock: (state, action: PayloadAction<unknown>) => {
      state.context.navigationStateBeforeLock = action.payload;
    },
    clearNavigationStateBeforeLock: (state) => {
      state.context.navigationStateBeforeLock = undefined;
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
      state.context.lastAuthenticationTime = undefined;
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
  navigateToLogin,
  navigateToHome,
  authenticationError,
  saveNavigationStateBeforeLock,
  clearNavigationStateBeforeLock,
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
    state === AuthenticationState.AUTHENTICATION_FAILED,
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

export const selectIsBackgroundTimerActive = createSelector(
  selectCurrentAuthState,
  (state) => state === AuthenticationState.BACKGROUND_TIMER_ACTIVE,
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
      current === AuthenticationState.AUTHENTICATION_FAILED,
    biometricAvailable: context.biometricAvailable,
    rememberMeEnabled: context.rememberMeEnabled,
    error: context.error,
    stateChangedAt: changedAt,
  }),
);

export const selectNavigationStateBeforeLock = createSelector(
  selectAuthContext,
  (context) => context.navigationStateBeforeLock,
);
