import { createSelector } from 'reselect';
import { selectAssetsDefiPositionsEnabled } from './featureFlagController/assetsDefiPositions';
import { selectBasicFunctionalityEnabled } from './settings';

/**
 * Whether the homepage / DeFi UI should offer DeFi positions.
 * Matches {@link DeFiPositionsController} `isEnabled()` (remote flag + basic functionality).
 *
 * Kept out of `featureFlagController/assetsDefiPositions` to avoid importing `settings`
 * there (circular init with Wallet → selectors can leave Hermes without that export).
 */
export const selectDeFiPositionsSectionEnabled = createSelector(
  selectAssetsDefiPositionsEnabled,
  selectBasicFunctionalityEnabled,
  (assetsDefiPositionsEnabled, basicFunctionalityEnabled) =>
    assetsDefiPositionsEnabled && basicFunctionalityEnabled,
);
