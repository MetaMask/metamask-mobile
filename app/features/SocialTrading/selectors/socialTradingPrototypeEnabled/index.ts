import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';

import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { getFeatureFlagValue } from '../../../../selectors/featureFlagController/env';

/**
 * The Social Trading prototype is disabled by default. Enable it locally
 * with the MM_SOCIAL_TRADING_PROTOTYPE_ENABLED env var or via the feature
 * flag override developer screen.
 */
export const DEFAULT_SOCIAL_TRADING_PROTOTYPE_ENABLED = false;
export const FEATURE_FLAG_NAME = 'socialTradingPrototypeEnabled';

export const selectSocialTradingPrototypeEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteValue = hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? (remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean)
      : DEFAULT_SOCIAL_TRADING_PROTOTYPE_ENABLED;

    return getFeatureFlagValue(
      process.env.MM_SOCIAL_TRADING_PROTOTYPE_ENABLED,
      remoteValue,
    );
  },
);
