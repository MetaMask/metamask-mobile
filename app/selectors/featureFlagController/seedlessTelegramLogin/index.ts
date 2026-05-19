import { hasProperty } from '@metamask/utils';
import { createSelector } from 'reselect';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { getFeatureFlagValue } from '../env';
import { selectRemoteFeatureFlags } from '..';

/**
 * LaunchDarkly key string for CI / static analysis (see `known-feature-flag-constants.ts`).
 */
export const TELEGRAM_LOGIN_ENABLED_FLAG_NAME =
  FeatureFlagNames.telegramLoginEnabled;

/**
 * When true, seedless onboarding shows Telegram sign-in and the OAuth factory may return
 * a Telegram login handler when callers pass `telegramLoginEnabled: true`. When false, the
 * Telegram onboarding button is hidden; token refresh still passes `telegramLoginEnabled: true`
 * from `AuthTokenHandler` for existing Telegram sessions.
 */
export const DEFAULT_TELEGRAM_LOGIN_ENABLED = true;

export const selectTelegramLoginEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteValue = hasProperty(
      remoteFeatureFlags,
      FeatureFlagNames.telegramLoginEnabled,
    )
      ? Boolean(remoteFeatureFlags[FeatureFlagNames.telegramLoginEnabled])
      : DEFAULT_TELEGRAM_LOGIN_ENABLED;
    return getFeatureFlagValue(
      process.env.MM_TELEGRAM_LOGIN_ENABLED,
      remoteValue,
    );
  },
);
