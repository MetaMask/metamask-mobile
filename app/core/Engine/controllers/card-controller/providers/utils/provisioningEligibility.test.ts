import {
  isAccountEligibleForProvisioning,
  PROVISIONING_ELIGIBLE_AFTER,
} from './provisioningEligibility';

describe('isAccountEligibleForProvisioning', () => {
  it('returns false for null or undefined', () => {
    expect(isAccountEligibleForProvisioning(null)).toBe(false);
    expect(isAccountEligibleForProvisioning(undefined)).toBe(false);
  });

  it('returns false for invalid date strings', () => {
    expect(isAccountEligibleForProvisioning('')).toBe(false);
    expect(isAccountEligibleForProvisioning('not-a-date')).toBe(false);
  });

  it('returns false for accounts created before the cutoff', () => {
    expect(isAccountEligibleForProvisioning('2025-11-09T23:59:59.999Z')).toBe(
      false,
    );
  });

  it('returns true for accounts created on or after the cutoff', () => {
    expect(isAccountEligibleForProvisioning('2025-11-10T00:00:00.000Z')).toBe(
      true,
    );
    expect(isAccountEligibleForProvisioning('2026-06-01T00:00:00.000Z')).toBe(
      true,
    );
  });

  it('uses the November 10 2025 cutoff', () => {
    expect(PROVISIONING_ELIGIBLE_AFTER).toBe('2025-11-10T00:00:00.000Z');
  });
});
