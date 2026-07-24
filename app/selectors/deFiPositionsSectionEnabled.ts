import { createSelector } from 'reselect';
import { selectDefiControllerV2Enabled } from './featureFlagController/defiControllerV2';
import { selectBasicFunctionalityEnabled } from './settings';

/**
 * Whether the homepage / DeFi UI should use the legacy DeFi positions (V1) path.
 * True when V2 is off and basic functionality is enabled.
 *
 * Kept out of `featureFlagController/defiControllerV2` to avoid importing
 * `settings` there (circular init with Wallet → selectors can leave Hermes without
 * that export).
 */
export const selectDeFiPositionsSectionEnabled = createSelector(
  selectDefiControllerV2Enabled,
  selectBasicFunctionalityEnabled,
  (defiControllerV2Enabled, basicFunctionalityEnabled) =>
    !defiControllerV2Enabled && basicFunctionalityEnabled,
);
