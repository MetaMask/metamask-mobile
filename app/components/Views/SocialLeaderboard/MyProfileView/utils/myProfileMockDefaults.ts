/**
 * TODO: Remove this module once My Profile reads sheet stats from social-api
 * (volume, trade count, profile age, copy success rate) and local `*` mocks
 * are no longer needed. Delete `myProfileMockDefaults.test.ts` and stop calling
 * `applyMyProfileMockDefaults` from `overlayMyProfileLiveStats`.
 */
import type { MySocialProfile } from '../hooks/useMyProfile';

/** Sheet-only mock stats for Giga Whale until social-api exposes them. */
export const MY_PROFILE_SHEET_MOCK_DEFAULTS = {
  volumeUsd30d: 386_260,
  tradeCount30d: 39,
  profileAgeLabel: '2y',
  copySuccessRatePercent: 72,
} as const;

/**
 * Fills sheet mock fields on profiles created before those keys existed
 * (Metro hot reload keeps the in-memory store without re-running bootstrap).
 */
export const applyMyProfileMockDefaults = (
  profile: MySocialProfile,
): MySocialProfile => ({
  ...profile,
  volumeUsd30d:
    profile.volumeUsd30d ?? MY_PROFILE_SHEET_MOCK_DEFAULTS.volumeUsd30d,
  tradeCount30d:
    profile.tradeCount30d ?? MY_PROFILE_SHEET_MOCK_DEFAULTS.tradeCount30d,
  profileAgeLabel:
    profile.profileAgeLabel?.trim() ||
    MY_PROFILE_SHEET_MOCK_DEFAULTS.profileAgeLabel,
  copySuccessRatePercent:
    profile.copySuccessRatePercent ??
    MY_PROFILE_SHEET_MOCK_DEFAULTS.copySuccessRatePercent,
});
