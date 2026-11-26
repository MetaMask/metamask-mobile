import ReduxService from '../redux';
import {
  TIER_POLICY_BUILD_DEFAULT,
  selectTierPolicyEnabled,
} from '../../selectors/featureFlagController/networking';

/** Reads the flag outside React. */
export function isTierPolicyEnabled(): boolean {
  try {
    return selectTierPolicyEnabled(ReduxService.store.getState());
  } catch {
    // No store yet, or a malformed remote flag: use the build default.
    return TIER_POLICY_BUILD_DEFAULT;
  }
}
