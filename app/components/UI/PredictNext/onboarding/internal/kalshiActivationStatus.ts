import type { RootState } from '../../../../../reducers';
import { KALSHI_KYC_VENDOR } from '../../../KYC/vendors/kalshi';

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
