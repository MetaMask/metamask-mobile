import { VbaOnboardingStage } from '@metamask/ramps-controller';
import { getVbaRouteForStage } from './getVbaRouteForStage';
import Routes from '../../../../../constants/navigation/Routes';

describe('getVbaRouteForStage', () => {
  it('maps every VBA onboarding stage to a route', () => {
    expect(
      Object.fromEntries(
        Object.values(VbaOnboardingStage).map((stage) => [
          stage,
          getVbaRouteForStage(stage),
        ]),
      ),
    ).toMatchInlineSnapshot(`
      {
        "Completed": "MoneyHome",
        "EmailOtpRequired": "RampVbaKycEmail",
        "KycPending": "RampVbaKycPending",
        "KycRejected": "RampVbaKycRejected",
        "KycRequired": "RampVbaVerifyIdentity",
        "ProviderTermsRequired": "RampVbaProviderTerms",
        "VendorTermsRequired": "RampGetPixKey",
      }
    `);
  });

  it('routes a missing stage to the recoverable error screen', () => {
    expect(getVbaRouteForStage(null)).toBe(Routes.RAMP.VBA_ONBOARDING_ERROR);
    expect(getVbaRouteForStage(undefined)).toBe(
      Routes.RAMP.VBA_ONBOARDING_ERROR,
    );
  });
});
