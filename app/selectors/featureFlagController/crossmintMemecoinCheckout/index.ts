import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * Selector for the Crossmint memecoin Apple Pay checkout feature flag.
 *
 * TEMP: Hardcoded to `true` until the LaunchDarkly flag
 * `crossmintMemecoinCheckout` is created and wired. Restore env/remote
 * resolution (getFeatureFlagValue + validatedVersionGatedFeatureFlag) then.
 */
export const selectCrossmintMemecoinCheckoutEnabled = createSelector(
  selectRemoteFeatureFlags,
  () => true,
);
