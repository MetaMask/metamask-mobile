import {
  BFT_CHILD_PREFERENCES,
  BFT_ENABLED_CHILDREN_LANDING_THRESHOLD,
  type BftChildPreference,
} from './bftChildPreferences';

export interface ComputeBasicFunctionalityMigrationLandingStateParams {
  basicFunctionalityEnabled: boolean;
  childPreferenceValues: Partial<Record<BftChildPreference, unknown>>;
  isSocialLogin: boolean;
}

export interface BasicFunctionalityMigrationLandingState {
  landingState: boolean;
  enabledChildren: number;
  isConsistent: boolean;
  shouldNotify: boolean;
}

/**
 * Computes consolidated Basic Functionality landing state for legacy users.
 *
 * Rules matching extension migration:
 * - BF ON → land ON
 * - Social login with BF OFF → land ON
 * - BF OFF with more than {@link BFT_ENABLED_CHILDREN_LANDING_THRESHOLD}
 * children ON → land ON
 * - Otherwise land OFF
 *
 * Notification is skipped only when the pre-migration config was already
 * consistent (all children match BF). Social login always notifies.
 */
export function computeBasicFunctionalityMigrationLandingState({
  basicFunctionalityEnabled,
  childPreferenceValues,
  isSocialLogin,
}: ComputeBasicFunctionalityMigrationLandingStateParams): BasicFunctionalityMigrationLandingState {
  const enabledChildren = BFT_CHILD_PREFERENCES.filter(
    (preference) => childPreferenceValues[preference] === true,
  ).length;

  const areAllChildrenEnabled =
    enabledChildren === BFT_CHILD_PREFERENCES.length;
  const areAllChildrenDisabled = enabledChildren === 0;
  const isConsistent =
    (basicFunctionalityEnabled && areAllChildrenEnabled) ||
    (!basicFunctionalityEnabled && areAllChildrenDisabled);

  const landingState =
    basicFunctionalityEnabled ||
    isSocialLogin ||
    enabledChildren > BFT_ENABLED_CHILDREN_LANDING_THRESHOLD;

  return {
    landingState,
    enabledChildren,
    isConsistent,
    shouldNotify: isSocialLogin || !isConsistent,
  };
}
