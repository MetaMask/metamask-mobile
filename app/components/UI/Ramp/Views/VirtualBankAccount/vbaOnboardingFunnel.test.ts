import Routes from '../../../../../constants/navigation/Routes';
import { VBA_FUNNEL, getVbaRouteForSnapshot } from './vbaOnboardingFunnel';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from './vbaOnboardingSnapshot';

const snapshot = (
  overrides: Partial<VbaOnboardingSnapshot> = {},
): VbaOnboardingSnapshot => ({
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
  ...overrides,
});

describe('getVbaRouteForSnapshot', () => {
  it('maps snapshot facts onto funnel routes', () => {
    const cases: [string, VbaOnboardingSnapshot][] = [
      ['empty', snapshot()],
      ['terms one done', snapshot({ vendorTermsAcceptedLocally: true })],
      [
        'email and vendor terms done',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
        }),
      ],
      [
        'provider done',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
        }),
      ],
      [
        'sumsub submitted',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          kycStatus: 'pending',
        }),
      ],
      [
        'autoramp ready',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          kycStatus: 'approved',
          autorampStatus: 'ready',
        }),
      ],
      ['kyc rejected', snapshot({ kycStatus: 'rejected' })],
    ];

    expect(
      Object.fromEntries(
        cases.map(([label, facts]) => [label, getVbaRouteForSnapshot(facts)]),
      ),
    ).toMatchInlineSnapshot(`
      {
        "autoramp ready": "MoneyHome",
        "email and vendor terms done": "RampVbaVerifyIdentity",
        "empty": "RampCreateVirtualBankAccount",
        "kyc rejected": "RampVbaKycRejected",
        "provider done": "RampVbaSumSubKyc",
        "sumsub submitted": "RampVbaKycPending",
        "terms one done": "RampVbaKycEmail",
      }
    `);
  });

  it('routes a missing snapshot to the recoverable error screen', () => {
    expect(getVbaRouteForSnapshot(null)).toBe(Routes.RAMP.VBA_ONBOARDING_ERROR);
    expect(getVbaRouteForSnapshot(undefined)).toBe(
      Routes.RAMP.VBA_ONBOARDING_ERROR,
    );
  });

  it('lists vendor terms before email in the client-owned funnel', () => {
    expect(VBA_FUNNEL.map(({ id }) => id)).toStrictEqual([
      'vendorTerms',
      'email',
      'providerTerms',
      'sumsub',
      'pending',
    ]);
  });
});
