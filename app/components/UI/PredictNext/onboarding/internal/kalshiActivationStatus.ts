import type { KalshiOnboardingState } from '../../contracts/v1/onboarding';

/**
 * The last step of the Kalshi demo onboarding: KYC approved, withdrawal
 * address not registered yet. `active` means the account is ready; every
 * other state belongs to the KYC flow or the debug panel.
 *
 * @param state - The state predict-api reports for this device.
 * @returns Whether the user still has to register a withdrawal address.
 */
export const isKalshiActivationRequired = (
  state: KalshiOnboardingState | undefined,
): boolean => state === 'approved';
