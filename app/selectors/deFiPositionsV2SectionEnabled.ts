import { createSelector } from 'reselect';
import { selectDefiControllerV2Enabled } from './featureFlagController/defiControllerV2';
import { selectBasicFunctionalityEnabled } from './settings';

/**
 * Whether the homepage / DeFi UI should use DeFi positions V2.
 * True when V2 is on and basic functionality is enabled (mutually exclusive with
 * the V1 path via {@link selectDefiControllerV2Enabled}).
 * Onboarding is checked inside the V2 controller / fetch hook separately.
 *
 * Kept out of `featureFlagController/defiControllerV2` to avoid importing
 * `settings` there (circular init risk, same pattern as V1).
 */
export const selectDeFiPositionsV2SectionEnabled = createSelector(
  selectDefiControllerV2Enabled,
  selectBasicFunctionalityEnabled,
  (defiControllerV2Enabled, basicFunctionalityEnabled) =>
    defiControllerV2Enabled && basicFunctionalityEnabled,
);
