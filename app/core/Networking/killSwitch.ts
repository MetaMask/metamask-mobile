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
    // shortcut: a read before the store exists is logged by ReduxService; add a quiet getter if a pre-store caller appears.
    return TIER_POLICY_BUILD_DEFAULT;
  }
}
