import { createSelector } from 'reselect';
import { selectAssetsDefiPositionsV2Enabled } from './featureFlagController/assetsDefiPositionsV2';
import { selectBasicFunctionalityEnabled } from './settings';

/**
 * Whether the homepage / DeFi UI should use the legacy DeFi positions (V1) path.
 * True when V2 is off and basic functionality is enabled.
 *
 * Kept out of `featureFlagController/assetsDefiPositionsV2` to avoid importing
 * `settings` there (circular init with Wallet → selectors can leave Hermes without
 * that export).
 */
export const selectDeFiPositionsSectionEnabled = createSelector(
  selectAssetsDefiPositionsV2Enabled,
  selectBasicFunctionalityEnabled,
  (assetsDefiPositionsV2Enabled, basicFunctionalityEnabled) =>
    !assetsDefiPositionsV2Enabled && basicFunctionalityEnabled,
);
