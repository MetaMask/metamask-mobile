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
        'session exists without vendor disclaimers recorded',
        snapshot({
          sessionExists: true,
          vendorTermsAcceptedLocally: true,
        }),
      ],
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
          providerFlowStatus: 'submitted',
          kycStatus: 'pending',
        }),
      ],
      [
        'sumsub submitted before review',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          providerFlowStatus: 'submitted',
        }),
      ],
      [
        'sumsub submitted but kyc retry',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          providerFlowStatus: 'submitted',
          kycStatus: 'retry',
        }),
      ],
      [
        'sumsub submitted and account ready',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          providerFlowStatus: 'submitted',
          kycStatus: 'approved',
          autorampStatus: 'ready',
        }),
      ],
      [
        'sumsub abandoned',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          providerFlowStatus: 'abandoned',
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
        'needs wallet registration',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          kycStatus: 'approved',
          autorampStatus: 'needs_wallet_registration',
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
      [
        'usable account after reinstall wiped local onboarding',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: false,
          sessionDisclaimersComplete: false,
          kycStatus: 'approved',
          autorampStatus: 'ready',
        }),
      ],
      ['kyc rejected', snapshot({ kycStatus: 'rejected' })],
      ['kyc retry', snapshot({ kycStatus: 'retry' })],
      [
        'kyc retry after the provider flow was abandoned',
        snapshot({
          sessionExists: true,
          vendorDisclaimersComplete: true,
          sessionDisclaimersComplete: true,
          providerFlowStatus: 'abandoned',
          kycStatus: 'retry',
        }),
      ],
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
        "account provisioning failed": "identityVerified",
        "account provisioning in progress": "identityVerified",
        "account provisioning not ready": "identityVerified",
        "account ready": "complete",
        "email and vendor terms done": "identityVerification",
        "empty": "vendorTerms",
        "kyc rejected": "kycRejected",
        "kyc retry": "kycRejected",
        "kyc retry after the provider flow was abandoned": "kycRejected",
        "needs wallet registration": "identityVerified",
        "provider done": "identityVerification",
        "session exists without vendor disclaimers recorded": "identityVerification",
        "session pending before provider terms": "identityVerification",
        "sumsub abandoned": "identityVerification",
        "sumsub submitted": "kycPending",
        "sumsub submitted and account ready": "complete",
        "sumsub submitted before review": "kycPending",
        "sumsub submitted but kyc retry": "identityVerification",
        "usable account after reinstall wiped local onboarding": "complete",
        "vendor terms done": "email",
      }
    `);
  });

  it('opens the completed account when a usable autoramp remains after reinstall', () => {
    const facts = snapshot({
      sessionExists: false,
      vendorTermsAcceptedLocally: false,
      vendorDisclaimersComplete: false,
      sessionDisclaimersComplete: false,
      kycStatus: 'approved',
      autorampStatus: 'ready',
    });

    const destination = getVbaDestinationForSnapshot(facts);

    expect(destination).toBe('complete');
  });

  it('keeps a rejected applicant on the failure screen when an autoramp is ready', () => {
    const facts = snapshot({
      kycStatus: 'rejected',
      autorampStatus: 'ready',
    });

    const destination = getVbaDestinationForSnapshot(facts);

    expect(destination).toBe('kycRejected');
  });

  const consentedPending = {
    sessionExists: true,
    vendorDisclaimersComplete: true,
    sessionDisclaimersComplete: true,
    providerFlowStatus: 'not_started' as const,
    kycStatus: 'pending' as const,
  };

  it.each([
    ['kyc', 'identityVerification'],
    ['emailOtpCollection', 'identityVerification'],
    ['phoneOtpCollection', 'identityVerification'],
    ['capabilityAuthorization', 'identityVerification'],
    ['consents', 'identityVerification'],
    ['processing', 'kycPending'],
    [null, 'kycPending'],
    [undefined, 'kycPending'],
    ['approved', 'kycPending'],
    ['rejected', 'kycPending'],
    ['not-a-step', 'kycPending'],
    ['', 'kycPending'],
  ] as const)(
    'kycCurrentStep %s with a pending unsubmitted session opens %s',
    (kycCurrentStep, destination) => {
      expect(
        getVbaDestinationForSnapshot(
          snapshot({ ...consentedPending, kycCurrentStep }),
        ),
      ).toBe(destination);
    },
  );

  it.each([
    'kyc',
    'emailOtpCollection',
    'phoneOtpCollection',
    'capabilityAuthorization',
    'consents',
  ] as const)(
    'a local submit at %s opens the pending screen',
    (kycCurrentStep) => {
      expect(
        getVbaDestinationForSnapshot(
          snapshot({
            ...consentedPending,
            providerFlowStatus: 'submitted',
            kycCurrentStep,
          }),
        ),
      ).toBe('kycPending');
    },
  );

  it.each([
    'kyc',
    'emailOtpCollection',
    'phoneOtpCollection',
    'capabilityAuthorization',
    'consents',
  ] as const)(
    'an abandoned flow at %s opens identity verification',
    (kycCurrentStep) => {
      expect(
        getVbaDestinationForSnapshot(
          snapshot({
            ...consentedPending,
            providerFlowStatus: 'abandoned',
            kycCurrentStep,
          }),
        ),
      ).toBe('identityVerification');
    },
  );

  it.each([
    'kyc',
    'emailOtpCollection',
    'phoneOtpCollection',
    'capabilityAuthorization',
    'consents',
  ] as const)('a retry at %s opens the rejected screen', (kycCurrentStep) => {
    expect(
      getVbaDestinationForSnapshot(
        snapshot({
          ...consentedPending,
          kycStatus: 'retry',
          kycCurrentStep,
        }),
      ),
    ).toBe('kycRejected');
  });

  it('opens identity verification when a retry was submitted and the step is processing', () => {
    expect(
      getVbaDestinationForSnapshot(
        snapshot({
          ...consentedPending,
          kycStatus: 'retry',
          providerFlowStatus: 'submitted',
          kycCurrentStep: 'processing',
        }),
      ),
    ).toBe('identityVerification');
  });

  it('opens the pending screen when the step is processing and there is no KYC status', () => {
    expect(
      getVbaDestinationForSnapshot(
        snapshot({
          ...consentedPending,
          kycStatus: 'none',
          kycCurrentStep: 'processing',
        }),
      ),
    ).toBe('kycPending');
  });

  it.each([
    'kyc',
    'emailOtpCollection',
    'phoneOtpCollection',
    'capabilityAuthorization',
    'consents',
    'processing',
    null,
    'approved',
    'rejected',
    'not-a-step',
  ] as const)(
    'an approved account opens account details at step %s',
    (kycCurrentStep) => {
      expect(
        getVbaDestinationForSnapshot(
          snapshot({
            ...consentedPending,
            kycStatus: 'approved',
            autorampStatus: 'ready',
            kycCurrentStep,
          }),
        ),
      ).toBe('complete');
    },
  );

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
