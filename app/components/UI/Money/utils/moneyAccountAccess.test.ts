import {
  assertMoneyAccountAccessible,
  getMoneyAccountAccessBlockReason,
  MoneyAccountAccessBlockedError,
} from './moneyAccountAccess';

describe('getMoneyAccountAccessBlockReason', () => {
  it('returns feature_disabled when the feature is disabled', () => {
    const reason = getMoneyAccountAccessBlockReason({
      isMoneyAccountEnabled: false,
      isMoneyAccountGeoEligible: true,
    });

    expect(reason).toBe('feature_disabled');
  });

  it('returns geo_blocked when the feature is enabled and geo-ineligible', () => {
    const reason = getMoneyAccountAccessBlockReason({
      isMoneyAccountEnabled: true,
      isMoneyAccountGeoEligible: false,
    });

    expect(reason).toBe('geo_blocked');
  });

  it('returns feature_disabled when both restrictions apply', () => {
    const reason = getMoneyAccountAccessBlockReason({
      isMoneyAccountEnabled: false,
      isMoneyAccountGeoEligible: false,
    });

    expect(reason).toBe('feature_disabled');
  });

  it('returns undefined when the Money account is accessible', () => {
    const reason = getMoneyAccountAccessBlockReason({
      isMoneyAccountEnabled: true,
      isMoneyAccountGeoEligible: true,
    });

    expect(reason).toBeUndefined();
  });
});

describe('assertMoneyAccountAccessible', () => {
  it('does not throw when no access block reason exists', () => {
    expect(() => assertMoneyAccountAccessible(undefined)).not.toThrow();
  });

  it('throws a typed error containing the access block reason', () => {
    expect(() => assertMoneyAccountAccessible('geo_blocked')).toThrow(
      expect.objectContaining<Partial<MoneyAccountAccessBlockedError>>({
        name: 'MoneyAccountAccessBlockedError',
        reason: 'geo_blocked',
      }),
    );
  });
});
