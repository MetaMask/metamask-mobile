import { hasProperty } from '@metamask/utils';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { getFeatureFlagValue } from '../env';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_CROSSMINT_MEMECOIN_CHECKOUT_ENABLED = false;

/**
 * Selector for the Crossmint memecoin Apple Pay checkout feature flag.
 *
 * Resolution order:
 * 1. Local env override via `MM_CROSSMINT_MEMECOIN_CHECKOUT_ENABLED` (`getFeatureFlagValue`).
 * 2. Boolean dev-tool local override on the remote flag object.
 * 3. Remote version-gated flag via `validatedVersionGatedFeatureFlag`.
 * 4. Default (`false`) when the flag is absent or invalid.
 */
export const selectCrossmintMemecoinCheckoutEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    let remoteValue = DEFAULT_CROSSMINT_MEMECOIN_CHECKOUT_ENABLED;

    if (
      hasProperty(
        remoteFeatureFlags,
        FeatureFlagNames.crossmintMemecoinCheckout,
      )
    ) {
      const rawFlag =
        remoteFeatureFlags[FeatureFlagNames.crossmintMemecoinCheckout];

      if (typeof rawFlag === 'boolean') {
        remoteValue = rawFlag;
      } else {
        remoteValue =
          validatedVersionGatedFeatureFlag(
            rawFlag as unknown as VersionGatedFeatureFlag,
          ) ?? DEFAULT_CROSSMINT_MEMECOIN_CHECKOUT_ENABLED;
      }
    }

    return getFeatureFlagValue(
      process.env.MM_CROSSMINT_MEMECOIN_CHECKOUT_ENABLED,
      remoteValue,
    );
  },
);
