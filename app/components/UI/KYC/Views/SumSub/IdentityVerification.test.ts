import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import {
  getVbaIdentityVerificationInitialProviderParams,
  getVbaIdentityVerificationInitialRoute,
  replaceProviderTermsWithProvider,
} from './IdentityVerification';
import { VbaIdentityVerificationRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';

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

  it('resumes an abandoned provider flow at more information needed', () => {
    const snapshot = {
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'abandoned' as const,
    };

    const route = getVbaIdentityVerificationInitialRoute(snapshot);
    const providerParams =
      getVbaIdentityVerificationInitialProviderParams(snapshot);

    expect({ route, providerParams }).toMatchInlineSnapshot(`
      {
        "providerParams": {
          "initialNeedsMoreInfo": true,
        },
        "route": "VbaIdentityVerificationProvider",
      }
    `);
  });
});

describe('replaceProviderTermsWithProvider', () => {
  it('replaces provider terms instead of adding another back route', () => {
    const replace = jest.fn();

    replaceProviderTermsWithProvider({
      replace,
    } as unknown as Parameters<typeof replaceProviderTermsWithProvider>[0]);

    expect(replace).toHaveBeenCalledWith(
      VbaIdentityVerificationRoutes.PROVIDER,
      { initialNeedsMoreInfo: false },
    );
  });
});
