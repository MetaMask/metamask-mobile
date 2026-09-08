import { NeobankOnboardingStage } from '@metamask/ramps-controller';

export type NeobankStageRoute =
  | 'terms'
  | 'identity'
  | 'processing'
  | 'email'
  | 'complete'
  | 'error';

/**
 * Maps the Core-owned onboarding stage to one Mobile surface.
 *
 * @param stage - The stage returned by RampsController.
 * @returns The Mobile surface that owns the stage.
 */
export function getNeobankStageRoute(stage: unknown): NeobankStageRoute {
  switch (stage) {
    case NeobankOnboardingStage.NoUser:
    case NeobankOnboardingStage.VendorTermsRequired:
    case NeobankOnboardingStage.ProviderTermsRequired:
      return 'terms';
    case NeobankOnboardingStage.KycNotStarted:
    case NeobankOnboardingStage.KycStartedIncomplete:
      return 'identity';
    case NeobankOnboardingStage.KycPending:
    case NeobankOnboardingStage.WalletNotSigned:
    case NeobankOnboardingStage.AutorampNotCreated:
    case NeobankOnboardingStage.AutorampPending:
      return 'processing';
    case NeobankOnboardingStage.EmailOtpRequired:
      return 'email';
    case NeobankOnboardingStage.AutorampCreated:
      return 'complete';
    case NeobankOnboardingStage.KycRejected:
    case NeobankOnboardingStage.KycNeedsReview:
    case NeobankOnboardingStage.LookupFailed:
    default:
      return 'error';
  }
}
