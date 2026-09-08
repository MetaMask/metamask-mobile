import { NeobankOnboardingStage } from '@metamask/ramps-controller';
import { getNeobankStageRoute } from './neobankStageRoute';

describe('getNeobankStageRoute', () => {
  it.each([
    [NeobankOnboardingStage.NoUser, 'terms'],
    [NeobankOnboardingStage.VendorTermsRequired, 'terms'],
    [NeobankOnboardingStage.ProviderTermsRequired, 'terms'],
    [NeobankOnboardingStage.KycNotStarted, 'identity'],
    [NeobankOnboardingStage.KycStartedIncomplete, 'identity'],
    [NeobankOnboardingStage.KycPending, 'processing'],
    [NeobankOnboardingStage.WalletNotSigned, 'processing'],
    [NeobankOnboardingStage.AutorampNotCreated, 'processing'],
    [NeobankOnboardingStage.AutorampPending, 'processing'],
    [NeobankOnboardingStage.EmailOtpRequired, 'email'],
    [NeobankOnboardingStage.AutorampCreated, 'complete'],
    [NeobankOnboardingStage.KycRejected, 'error'],
    [NeobankOnboardingStage.KycNeedsReview, 'error'],
    [NeobankOnboardingStage.LookupFailed, 'error'],
  ] as const)('maps %s to %s', (stage, expectedRoute) => {
    expect(getNeobankStageRoute(stage)).toBe(expectedRoute);
  });

  it('fails closed for an unknown stage', () => {
    expect(getNeobankStageRoute('FutureStage')).toBe('error');
  });
});
