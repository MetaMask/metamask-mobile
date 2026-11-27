import type { RootState } from '../../../../../reducers';
import { KALSHI_KYC_VENDOR } from '../../../KYC/vendors/kalshi';
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

/**
 * Whether kyc-api approved this device's Kalshi account. Activation reads the
 * predict-api status only after this is true, so a user who has not finished
 * KYC costs no extra request. `GetStartedBanner` owns the focus refresh of the
 * vendor step; this selector only reads the result.
 *
 * @param state - The app state.
 * @returns Whether the KYC decision is approved.
 */
export const selectIsKalshiKycApproved = (state: RootState): boolean => {
  const vendor =
    state.engine.backgroundState.VendorOnboardingController?.vendors?.[
      KALSHI_KYC_VENDOR.id
    ];
  return vendor?.step === 'decision' && vendor?.status === 'approved';
};
