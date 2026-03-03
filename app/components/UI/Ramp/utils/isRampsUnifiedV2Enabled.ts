import {
  selectRampsUnifiedBuyV2ActiveFlag,
  selectRampsUnifiedBuyV2MinimumVersionFlag,
} from '../../../../selectors/featureFlagController/ramps/rampsUnifiedBuyV2';
import { hasMinimumRequiredVersion } from './hasMinimumRequiredVersion';
import { RootState } from '../../../../reducers';

/**
 * Non-hook equivalent of useRampsUnifiedV2Enabled.
 * Checks build flag override, active flag, and minimum version gate.
 * Use this in thunks / plain functions where hooks aren't available.
 */
export function isRampsUnifiedV2Enabled(state: RootState): boolean {
  const buildFlag = process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED;
  if (buildFlag === 'true' || buildFlag === 'false') {
    return buildFlag === 'true';
  }

  const activeFlag = selectRampsUnifiedBuyV2ActiveFlag(state);
  const minimumVersion = selectRampsUnifiedBuyV2MinimumVersionFlag(state);
  return hasMinimumRequiredVersion(minimumVersion, activeFlag);
}
