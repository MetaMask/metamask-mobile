export type MoneyAccountAccessBlockReason = 'feature_disabled' | 'geo_blocked';

export class MoneyAccountAccessBlockedError extends Error {
  readonly reason: MoneyAccountAccessBlockReason;

  constructor(reason: MoneyAccountAccessBlockReason) {
    super(`Money account access is blocked: ${reason}`);
    this.name = 'MoneyAccountAccessBlockedError';
    this.reason = reason;
  }
}

/**
 * Returns the highest-priority reason Money account access is blocked.
 *
 * Feature availability takes precedence over geo eligibility so callers show
 * the feature-disabled notice when both restrictions apply.
 */
export const getMoneyAccountAccessBlockReason = ({
  isMoneyAccountEnabled,
  isMoneyAccountGeoEligible,
}: {
  isMoneyAccountEnabled: boolean;
  isMoneyAccountGeoEligible: boolean;
}): MoneyAccountAccessBlockReason | undefined => {
  if (!isMoneyAccountEnabled) {
    return 'feature_disabled';
  }

  if (!isMoneyAccountGeoEligible) {
    return 'geo_blocked';
  }

  return undefined;
};

/**
 * Throws when a Money account operation is blocked.
 */
export const assertMoneyAccountAccessible = (
  reason: MoneyAccountAccessBlockReason | undefined,
): void => {
  if (reason) {
    throw new MoneyAccountAccessBlockedError(reason);
  }
};
