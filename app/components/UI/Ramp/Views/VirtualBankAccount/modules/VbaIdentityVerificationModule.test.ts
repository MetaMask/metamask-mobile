import { VbaIdentityVerificationRoutes } from '../routes';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from '../vbaOnboardingSnapshot';
import {
  getVbaIdentityVerificationInitialProviderParams,
  getVbaIdentityVerificationInitialRoute,
} from './VbaIdentityVerificationModule';

const snapshot = (
  overrides: Partial<VbaOnboardingSnapshot> = {},
): VbaOnboardingSnapshot => ({
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
  ...overrides,
});

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

  it('routes an abandoned provider flow with session disclaimers to need info', () => {
    const abandoned = snapshot({
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'abandoned',
    });

    const route = getVbaIdentityVerificationInitialRoute(abandoned);

    expect(route).toBe(VbaIdentityVerificationRoutes.NEED_INFO);
  });

  it('routes an abandoned provider flow without session disclaimers to provider terms', () => {
    const abandoned = snapshot({
      sessionDisclaimersComplete: false,
      providerFlowStatus: 'abandoned',
    });

    const route = getVbaIdentityVerificationInitialRoute(abandoned);

    expect(route).toBe(VbaIdentityVerificationRoutes.PROVIDER_TERMS);
  });

  it('routes submitted and not-started flows with session disclaimers to the provider', () => {
    const submitted = snapshot({
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted',
    });
    const notStarted = snapshot({
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'not_started',
    });

    expect(getVbaIdentityVerificationInitialRoute(submitted)).toBe(
      VbaIdentityVerificationRoutes.PROVIDER,
    );
    expect(getVbaIdentityVerificationInitialRoute(notStarted)).toBe(
      VbaIdentityVerificationRoutes.PROVIDER,
    );
  });

  it('keeps pending, rejected, and retry statuses off the need-info route', () => {
    const pending = snapshot({
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'not_started',
      kycStatus: 'pending',
    });
    const rejected = snapshot({
      sessionDisclaimersComplete: true,
      kycStatus: 'rejected',
    });
    const retry = snapshot({
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted',
      kycStatus: 'retry',
    });

    expect(getVbaIdentityVerificationInitialRoute(pending)).toBe(
      VbaIdentityVerificationRoutes.PROVIDER,
    );
    expect(getVbaIdentityVerificationInitialRoute(rejected)).toBe(
      VbaIdentityVerificationRoutes.PROVIDER,
    );
    expect(getVbaIdentityVerificationInitialRoute(retry)).toBe(
      VbaIdentityVerificationRoutes.PROVIDER,
    );
  });

  it('starts the provider screen with SumSub launch enabled', () => {
    const providerParams = getVbaIdentityVerificationInitialProviderParams();

    expect(providerParams).toEqual({
      initialNeedsMoreInfo: false,
    });
  });
});
