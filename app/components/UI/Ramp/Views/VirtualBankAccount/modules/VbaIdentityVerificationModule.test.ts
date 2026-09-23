import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../vbaOnboardingSnapshot';
import { getVbaIdentityVerificationInitialRoute } from './VbaIdentityVerificationModule';

describe('getVbaIdentityVerificationInitialRoute', () => {
  it('resumes at the first incomplete internal step', () => {
    expect({
      newSession: getVbaIdentityVerificationInitialRoute(
        EMPTY_VBA_ONBOARDING_SNAPSHOT,
      ),
      providerTermsAccepted: getVbaIdentityVerificationInitialRoute({
        ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
        sessionDisclaimersComplete: true,
      }),
    }).toMatchInlineSnapshot(`
      {
        "newSession": "VbaIdentityVerificationProviderTerms",
        "providerTermsAccepted": "VbaIdentityVerificationProvider",
      }
    `);
  });
});
