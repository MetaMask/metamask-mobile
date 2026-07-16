import { createSelector } from 'reselect';
import { selectAssetsDefiPositionsV2Enabled } from './featureFlagController/assetsDefiPositionsV2';
import { selectBasicFunctionalityEnabled } from './settings';

/**
 * Whether the homepage / DeFi UI should use DeFi positions V2.
 * True when V2 is on and basic functionality is enabled (mutually exclusive with
 * the V1 path via {@link selectAssetsDefiPositionsV2Enabled}).
 * Onboarding is checked inside the V2 controller / fetch hook separately.
 *
 * Kept out of `featureFlagController/assetsDefiPositionsV2` to avoid importing
 * `settings` there (circular init risk, same pattern as V1).
 */
export const selectDeFiPositionsV2SectionEnabled = createSelector(
  selectAssetsDefiPositionsV2Enabled,
  selectBasicFunctionalityEnabled,
  (assetsDefiPositionsV2Enabled, basicFunctionalityEnabled) =>
    assetsDefiPositionsV2Enabled && basicFunctionalityEnabled,
);
