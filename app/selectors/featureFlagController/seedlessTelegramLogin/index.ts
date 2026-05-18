import { hasProperty } from '@metamask/utils';
import { createSelector } from 'reselect';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { getFeatureFlagValue } from '../env';
import { selectRemoteFeatureFlags } from '..';

/**
 * LaunchDarkly key string for CI / static analysis (see `known-feature-flag-constants.ts`).
 */
export const SEEDLESS_TELEGRAM_LOGIN_ENABLED_FLAG_NAME =
  FeatureFlagNames.seedlessTelegramLoginEnabled;

/**
 * When true, seedless onboarding shows Telegram sign-in and the OAuth factory may return
 * a Telegram login handler. When false, the Telegram onboarding button is hidden and
 * `createLoginHandler` throws unless the internal bypass option is set (e.g. token refresh
 * for an already-linked Telegram account).
 */
export const DEFAULT_SEEDLESS_TELEGRAM_LOGIN_ENABLED = false;

export const selectSeedlessTelegramLoginEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteValue = hasProperty(
      remoteFeatureFlags,
      FeatureFlagNames.seedlessTelegramLoginEnabled,
    )
      ? Boolean(
          remoteFeatureFlags[FeatureFlagNames.seedlessTelegramLoginEnabled],
        )
      : DEFAULT_SEEDLESS_TELEGRAM_LOGIN_ENABLED;
    return getFeatureFlagValue(
      process.env.MM_SEEDLESS_TELEGRAM_LOGIN_ENABLED,
      remoteValue,
    );
  },
);
