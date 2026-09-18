import { NeobankOnboardingStage } from '@metamask/ramps-controller';
import { getNeobankStageRoute } from './neobankStageRoute';

jest.mock('@metamask/ramps-controller', () => ({
  NeobankOnboardingStage: {
    NoUser: 'NoUser',
    EmailOtpRequired: 'EmailOtpRequired',
    VendorTermsRequired: 'VendorTermsRequired',
    ProviderTermsRequired: 'ProviderTermsRequired',
    KycNotStarted: 'KycNotStarted',
    KycStartedIncomplete: 'KycStartedIncomplete',
    KycRejected: 'KycRejected',
    KycNeedsReview: 'KycNeedsReview',
    KycPending: 'KycPending',
    WalletNotSigned: 'WalletNotSigned',
    AutorampNotCreated: 'AutorampNotCreated',
    AutorampPending: 'AutorampPending',
    AutorampCreated: 'AutorampCreated',
    LookupFailed: 'LookupFailed',
  },
}));

describe('getNeobankStageRoute', () => {
  it.each([
    [NeobankOnboardingStage.NoUser, 'terms'],
    [NeobankOnboardingStage.VendorTermsRequired, 'terms'],
    [NeobankOnboardingStage.ProviderTermsRequired, 'terms'],
    [NeobankOnboardingStage.KycNotStarted, 'kyc'],
    [NeobankOnboardingStage.KycStartedIncomplete, 'kyc'],
    [NeobankOnboardingStage.KycNeedsReview, 'kyc'],
    [NeobankOnboardingStage.KycPending, 'processing'],
    [NeobankOnboardingStage.WalletNotSigned, 'processing'],
    [NeobankOnboardingStage.AutorampNotCreated, 'processing'],
    [NeobankOnboardingStage.AutorampPending, 'processing'],
    [NeobankOnboardingStage.EmailOtpRequired, 'email'],
    [NeobankOnboardingStage.AutorampCreated, 'complete'],
    [NeobankOnboardingStage.KycRejected, 'error'],
    [NeobankOnboardingStage.LookupFailed, 'error'],
  ] as const)('maps %s to %s', (stage, expectedRoute) => {
    expect(getNeobankStageRoute(stage)).toBe(expectedRoute);
  });

  it('fails closed for an unknown stage', () => {
    expect(getNeobankStageRoute('FutureStage')).toBe('error');
  });
});
