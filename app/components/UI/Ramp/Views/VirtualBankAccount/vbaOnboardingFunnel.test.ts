import {
  VBA_ONBOARDING_MODULES,
  getVbaDestinationForSnapshot,
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

describe('getVbaDestinationForSnapshot', () => {
  it('maps snapshot facts onto modules and status destinations', () => {
    const cases: [string, VbaOnboardingSnapshot][] = [
      ['empty', snapshot()],
      ['vendor terms done', snapshot({ vendorTermsAcceptedLocally: true })],
      [
        'email and vendor terms done',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
        }),
      ],
      [
        'session pending before provider terms',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          kycStatus: 'pending',
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
        'account provisioning failed',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          kycStatus: 'approved',
          autorampStatus: 'retryable_failure',
        }),
      ],
      [
        'account provisioning not ready',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          kycStatus: 'approved',
          autorampStatus: 'not_ready',
        }),
      ],
      [
        'account provisioning in progress',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          kycStatus: 'approved',
          autorampStatus: 'in_progress',
        }),
      ],
      [
        'account ready',
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
        cases.map(([label, facts]) => [
          label,
          getVbaDestinationForSnapshot(facts),
        ]),
      ),
    ).toMatchInlineSnapshot(`
      {
        "account provisioning failed": "accountProvisioningError",
        "account provisioning in progress": "kycPending",
        "account provisioning not ready": "kycPending",
        "account ready": "complete",
        "email and vendor terms done": "identityVerification",
        "empty": "vendorTerms",
        "kyc rejected": "kycRejected",
        "provider done": "identityVerification",
        "session pending before provider terms": "identityVerification",
        "sumsub submitted": "kycPending",
        "vendor terms done": "email",
      }
    `);
  });

  it('routes a missing snapshot to the recoverable error screen', () => {
    expect(getVbaDestinationForSnapshot(null)).toBe('error');
    expect(getVbaDestinationForSnapshot(undefined)).toBe('error');
  });

  it('lists only client-owned modules in funnel order', () => {
    expect(VBA_ONBOARDING_MODULES.map(({ id }) => id)).toStrictEqual([
      'vendorTerms',
      'email',
      'identityVerification',
    ]);
  });
});
