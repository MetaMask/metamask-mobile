export const BFT_CHILD_PREFERENCES = [
  'useTransactionSimulations',
  'securityAlertsEnabled',
  'isMultiAccountBalancesEnabled',
  'useSafeChainsListValidation',
  'useTokenDetection',
  'displayNftMedia',
  'useNftDetection',
] as const;

export type BftChildPreference = (typeof BFT_CHILD_PREFERENCES)[number];

export type BasicFunctionalityMigrationNotification =
  | 'bottom-sheet'
  | 'toast'
  | null;

export type BasicFunctionalityPreferenceState = {
  basicFunctionalityEnabled: boolean;
} & Record<BftChildPreference, boolean>;

export interface BasicFunctionalityConsolidationPlan {
  landingState: boolean;
  notification: BasicFunctionalityMigrationNotification;
}

/**
 * Extension lands mixed users on when at least 10 of 12 child preferences are
 * enabled. Mobile has fewer child preferences, so use the equivalent 75%
 * threshold: at least 6 of 7 enabled.
 */
export const BFT_ENABLED_CHILDREN_LANDING_THRESHOLD = Math.floor(
  BFT_CHILD_PREFERENCES.length * 0.75,
);

export function getBasicFunctionalityConsolidationPlan(
  preferences: BasicFunctionalityPreferenceState,
  isSocialLogin: boolean,
): BasicFunctionalityConsolidationPlan {
  const areAllChildrenEnabled = BFT_CHILD_PREFERENCES.every(
    (preference) => preferences[preference],
  );
  const areAllChildrenDisabled = BFT_CHILD_PREFERENCES.every(
    (preference) => !preferences[preference],
  );
  const enabledChildren = BFT_CHILD_PREFERENCES.filter(
    (preference) => preferences[preference],
  ).length;

  const landingState =
    preferences.basicFunctionalityEnabled ||
    isSocialLogin ||
    enabledChildren > BFT_ENABLED_CHILDREN_LANDING_THRESHOLD;
  const isConsistent =
    (preferences.basicFunctionalityEnabled && areAllChildrenEnabled) ||
    (!preferences.basicFunctionalityEnabled && areAllChildrenDisabled);

  return {
    landingState,
    notification: isSocialLogin
      ? 'bottom-sheet'
      : isConsistent
        ? null
        : 'toast',
  };
}

export function isBasicFunctionalitySocialLoginUser({
  accountType,
  authConnection,
  hasSeedlessVault,
}: {
  accountType?: string;
  authConnection?: string;
  hasSeedlessVault?: boolean;
}): boolean {
  return (
    Boolean(authConnection) ||
    hasSeedlessVault === true ||
    accountType?.includes('google') === true ||
    accountType?.includes('apple') === true ||
    accountType?.includes('telegram') === true
  );
}
