import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';

/**
 * Privacy mode for the user profile
 * - 'private': Searchable only, not visible on leaderboards
 * - 'public': Fully visible on leaderboards
 */
export type PrivacyMode = 'private' | 'public';

/**
 * User profile state interface
 */
export interface UserProfileState {
  // Opt-in status
  hasSeenOptInPrompt: boolean;
  isProfileEnabled: boolean;

  // Username data
  username: string | null; // e.g., "JohnDoe"

  // Privacy settings
  privacyMode: PrivacyMode;

  // Loading/error states
  isCheckingAvailability: boolean;
  isClaimingUsername: boolean;
  error: string | null;
}

/**
 * Initial state for user profile
 */
export const initialState: UserProfileState = {
  hasSeenOptInPrompt: false,
  isProfileEnabled: false,
  username: null,
  privacyMode: 'private',
  isCheckingAvailability: false,
  isClaimingUsername: false,
  error: null,
};

/**
 * The fixed suffix for all usernames
 */
export const USERNAME_SUFFIX = '@mm.io';

const name = 'userProfile';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    /**
     * Reset the entire user profile state
     */
    resetUserProfileState: () => initialState,

    /**
     * Mark the opt-in prompt as seen
     */
    setHasSeenOptInPrompt: (state, action: PayloadAction<boolean>) => {
      state.hasSeenOptInPrompt = action.payload;
    },

    /**
     * Enable or disable the user profile
     */
    setIsProfileEnabled: (state, action: PayloadAction<boolean>) => {
      state.isProfileEnabled = action.payload;
    },

    /**
     * Set the username (without the @mm.io suffix)
     */
    setUsername: (state, action: PayloadAction<string | null>) => {
      state.username = action.payload;
    },

    /**
     * Set the privacy mode
     */
    setPrivacyMode: (state, action: PayloadAction<PrivacyMode>) => {
      state.privacyMode = action.payload;
    },

    /**
     * Set loading state for checking username availability
     */
    setIsCheckingAvailability: (state, action: PayloadAction<boolean>) => {
      state.isCheckingAvailability = action.payload;
    },

    /**
     * Set loading state for claiming username
     */
    setIsClaimingUsername: (state, action: PayloadAction<boolean>) => {
      state.isClaimingUsername = action.payload;
    },

    /**
     * Set error message
     */
    setUserProfileError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    /**
     * Complete the profile setup (sets enabled, username, and privacy in one action)
     */
    completeProfileSetup: (
      state,
      action: PayloadAction<{
        username: string;
        privacyMode: PrivacyMode;
      }>,
    ) => {
      state.username = action.payload.username;
      state.privacyMode = action.payload.privacyMode;
      state.isProfileEnabled = true;
      state.hasSeenOptInPrompt = true;
      state.error = null;
    },

    /**
     * Skip the profile setup (user declined)
     */
    skipProfileSetup: (state) => {
      state.hasSeenOptInPrompt = true;
      state.isProfileEnabled = false;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

// Base selector
const selectUserProfileState = (state: RootState) => state[name];

// Derived selectors
export const selectHasSeenOptInPrompt = createSelector(
  selectUserProfileState,
  (userProfile) => userProfile.hasSeenOptInPrompt,
);

export const selectIsProfileEnabled = createSelector(
  selectUserProfileState,
  (userProfile) => userProfile.isProfileEnabled,
);

export const selectUsername = createSelector(
  selectUserProfileState,
  (userProfile) => userProfile.username,
);

/**
 * Get the full handle with suffix (e.g., "JohnDoe@mm.io")
 */
export const selectFullHandle = createSelector(selectUsername, (username) =>
  username ? `${username}${USERNAME_SUFFIX}` : null,
);

export const selectPrivacyMode = createSelector(
  selectUserProfileState,
  (userProfile) => userProfile.privacyMode,
);

export const selectIsCheckingAvailability = createSelector(
  selectUserProfileState,
  (userProfile) => userProfile.isCheckingAvailability,
);

export const selectIsClaimingUsername = createSelector(
  selectUserProfileState,
  (userProfile) => userProfile.isClaimingUsername,
);

export const selectUserProfileError = createSelector(
  selectUserProfileState,
  (userProfile) => userProfile.error,
);

/**
 * Check if the user has a claimed username
 */
export const selectHasUsername = createSelector(
  selectUsername,
  selectIsProfileEnabled,
  (username, isProfileEnabled) => Boolean(username && isProfileEnabled),
);

/**
 * Check if profile setup is needed (hasn't seen prompt yet)
 */
export const selectShouldShowOptInPrompt = createSelector(
  selectHasSeenOptInPrompt,
  (hasSeenOptInPrompt) => !hasSeenOptInPrompt,
);

// Export actions
export const {
  resetUserProfileState,
  setHasSeenOptInPrompt,
  setIsProfileEnabled,
  setUsername,
  setPrivacyMode,
  setIsCheckingAvailability,
  setIsClaimingUsername,
  setUserProfileError,
  completeProfileSetup,
  skipProfileSetup,
} = actions;
