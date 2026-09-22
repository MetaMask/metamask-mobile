import Routes from '../../../../../constants/navigation/Routes';
import {
  VBA_FUNNEL,
  completeVbaFunnelStep,
  getVbaRouteForSnapshot,
} from './vbaOnboardingFunnel';
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
      ['terms one done', snapshot({ termsOneAccepted: true })],
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
          finalStatus: 'pending',
        }),
      ],
      [
        'activation ready',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          kycStatus: 'approved',
          finalStatus: 'approved',
          activation: 'ready',
        }),
      ],
      ['kyc rejected', snapshot({ kycStatus: 'rejected' })],
      ['final rejected', snapshot({ finalStatus: 'rejected' })],
    ];

    expect(
      Object.fromEntries(
        cases.map(([label, facts]) => [label, getVbaRouteForSnapshot(facts)]),
      ),
    ).toMatchInlineSnapshot(`
      {
        "activation ready": "MoneyHome",
        "email and vendor terms done": "RampVbaVerifyIdentity",
        "empty": "RampGetPixKey",
        "final rejected": "RampVbaKycRejected",
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

  it('lists Terms 1 before email in the client-owned funnel', () => {
    expect(VBA_FUNNEL.map(({ id }) => id)).toStrictEqual([
      'termsOne',
      'email',
      'providerTerms',
      'sumsub',
      'pending',
    ]);
  });
});

describe('completeVbaFunnelStep', () => {
  it('advances Terms 1 completion to email', () => {
    const next = completeVbaFunnelStep(
      EMPTY_VBA_ONBOARDING_SNAPSHOT,
      'termsOne',
    );

    expect(getVbaRouteForSnapshot(next)).toBe(Routes.RAMP.VBA_KYC_EMAIL);
  });

  it('advances email and remote vendor terms completion to Terms 2', () => {
    const next = completeVbaFunnelStep(EMPTY_VBA_ONBOARDING_SNAPSHOT, 'email');

    expect(getVbaRouteForSnapshot(next)).toBe(Routes.RAMP.VBA_VERIFY_IDENTITY);
  });

  it('advances SumSub completion to the pending screen', () => {
    const next = completeVbaFunnelStep(
      snapshot({
        sessionExists: true,
        vendorDisclaimersComplete: true,
        sessionDisclaimersComplete: true,
      }),
      'sumsub',
    );

    expect(getVbaRouteForSnapshot(next)).toBe(Routes.RAMP.VBA_KYC_PENDING);
  });
});
