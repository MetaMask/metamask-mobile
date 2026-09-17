import { VbaOnboardingStage } from '@metamask/ramps-controller';
import Routes from '../../../../../constants/navigation/Routes';

export type VbaOnboardingRoute =
  | typeof Routes.RAMP.VBA_KYC_EMAIL
  | typeof Routes.RAMP.GET_PIX_KEY
  | typeof Routes.RAMP.VBA_PROVIDER_TERMS
  | typeof Routes.RAMP.VBA_VERIFY_IDENTITY
  | typeof Routes.RAMP.VBA_KYC_PENDING
  | typeof Routes.RAMP.VBA_KYC_REJECTED
  | typeof Routes.RAMP.VBA_ONBOARDING_ERROR
  | typeof Routes.MONEY.HOME;

const VBA_ROUTE_BY_STAGE: Record<VbaOnboardingStage, VbaOnboardingRoute> = {
  [VbaOnboardingStage.EmailOtpRequired]: Routes.RAMP.VBA_KYC_EMAIL,
  [VbaOnboardingStage.VendorTermsRequired]: Routes.RAMP.GET_PIX_KEY,
  [VbaOnboardingStage.ProviderTermsRequired]: Routes.RAMP.VBA_PROVIDER_TERMS,
  [VbaOnboardingStage.KycRequired]: Routes.RAMP.VBA_VERIFY_IDENTITY,
  [VbaOnboardingStage.KycPending]: Routes.RAMP.VBA_KYC_PENDING,
  [VbaOnboardingStage.KycRejected]: Routes.RAMP.VBA_KYC_REJECTED,
  [VbaOnboardingStage.Completed]: Routes.MONEY.HOME,
};

/**
 * Maps a Core VBA onboarding stage to the Mobile route that should present it.
 * Screens must not invent their own next-step from KYC state.
 *
 * @param stage - Stage returned by {@link RampsController.hydrateVbaOnboarding}.
 * @returns The route name for that stage, or the recoverable error route.
 */
export const getVbaRouteForStage = (
  stage: VbaOnboardingStage | null | undefined,
): VbaOnboardingRoute => {
  if (!stage) {
    return Routes.RAMP.VBA_ONBOARDING_ERROR;
  }
  return VBA_ROUTE_BY_STAGE[stage] ?? Routes.RAMP.VBA_ONBOARDING_ERROR;
};
