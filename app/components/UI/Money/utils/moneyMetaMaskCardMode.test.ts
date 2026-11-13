import {
  deriveMoneyCardSetupPollIntervalMs,
  deriveMoneyCardSetupView,
  deriveMoneyMetaMaskCardMode,
} from './moneyMetaMaskCardMode';

const baseInput = {
  isCardLinkedToMoneyAccount: false,
  isCardholder: false,
  isCardAuthenticated: false,
  isCardVerified: false,
  isResidencyBlocked: false,
  isMoneyAccountVisible: true,
  hasMoneyAccountBaseRequirements: true,
  hasMoneyAccountRequirements: true,
  isCardStateResolved: true,
  isCardHomeDataResolved: true,
  hasCardHomeDataFailed: false,
  isMoneyCardSectionAvailable: true,
};

describe('deriveMoneyMetaMaskCardMode', () => {
  it('returns manage when the card is linked to the Money account', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardLinkedToMoneyAccount: true,
      }),
    ).toBe('manage');
  });

  it('returns link for an unauthenticated cardholder when base requirements are met', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardholder: true,
        isCardAuthenticated: false,
        hasMoneyAccountBaseRequirements: true,
      }),
    ).toBe('link');
  });

  it('returns null for an unauthenticated cardholder when base requirements are not met', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardholder: true,
        isCardAuthenticated: false,
        hasMoneyAccountBaseRequirements: false,
      }),
    ).toBeNull();
  });

  it('returns null when residency is blocked', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardVerified: true,
        isResidencyBlocked: true,
      }),
    ).toBeNull();
  });

  it('returns link for a cardholder when full requirements are met', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardVerified: true,
        hasMoneyAccountRequirements: true,
      }),
    ).toBe('link');
  });

  it('returns null for a cardholder when full requirements are not met', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardVerified: true,
        hasMoneyAccountRequirements: false,
      }),
    ).toBeNull();
  });

  it('returns link for a verified authenticated non-cardholder when full requirements are met', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardAuthenticated: true,
        isCardVerified: true,
        hasMoneyAccountRequirements: true,
      }),
    ).toBe('link');
  });

  it('returns verifying for an authenticated but unverified non-cardholder', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardAuthenticated: true,
        isCardVerified: false,
      }),
    ).toBe('verifying');
  });

  it('returns upsell for a brand-new user', () => {
    expect(deriveMoneyMetaMaskCardMode(baseInput)).toBe('upsell');
  });

  it('returns null for upsell when the Money account is not visible', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isMoneyAccountVisible: false,
      }),
    ).toBeNull();
  });

  it('returns null for verifying when the Money account is not visible', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardAuthenticated: true,
        isCardVerified: false,
        isMoneyAccountVisible: false,
      }),
    ).toBeNull();
  });

  it('returns manage when linked even if the Money account is not visible', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardLinkedToMoneyAccount: true,
        isMoneyAccountVisible: false,
      }),
    ).toBe('manage');
  });

  it('returns link for a cardholder when full requirements are met even if visibility is off', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardVerified: true,
        hasMoneyAccountRequirements: true,
        isMoneyAccountVisible: false,
      }),
    ).toBe('link');
  });

  it('prefers manage over all other states when the card is linked', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardLinkedToMoneyAccount: true,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardVerified: false,
        isResidencyBlocked: true,
      }),
    ).toBe('manage');
  });

  it('prefers unauthenticated cardholder link over residency block', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardholder: true,
        isCardAuthenticated: false,
        isResidencyBlocked: true,
        hasMoneyAccountBaseRequirements: true,
      }),
    ).toBe('link');
  });

  it('returns loading when card state is unresolved and Money account is visible', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardStateResolved: false,
        isCardAuthenticated: true,
      }),
    ).toBe('loading');
  });

  it('returns null when card state is unresolved and Money account is not visible', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardStateResolved: false,
        isCardAuthenticated: true,
        isMoneyAccountVisible: false,
      }),
    ).toBeNull();
  });

  it('hides the card section when a provider without verification status failed its first card fetch', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardStateResolved: false,
        isCardHomeDataResolved: false,
        isCardAuthenticated: true,
        reportsVerificationStatus: false,
        hasCardHomeDataFailed: true,
      }),
    ).toBeNull();
  });

  it('keeps loading when a provider that reports verification status failed its first card fetch', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardStateResolved: false,
        isCardAuthenticated: true,
        reportsVerificationStatus: true,
        hasCardHomeDataFailed: true,
      }),
    ).toBe('loading');
  });

  it('returns null for an authenticated unverified user when the Money account is hidden', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardAuthenticated: true,
        isCardVerified: false,
        isCardholder: false,
        isMoneyAccountVisible: false,
        reportsVerificationStatus: false,
      }),
    ).toBeNull();
  });

  it('returns loading for a provider without verification status while card data is unresolved', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardStateResolved: false,
        isCardHomeDataResolved: false,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: true,
        reportsVerificationStatus: false,
      }),
    ).toBe('loading');
  });

  it('shows the card upsell for an authenticated Money account user who is not verified', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardAuthenticated: true,
        isCardVerified: false,
        isCardholder: false,
        reportsVerificationStatus: false,
      }),
    ).toBe('upsell');
  });

  it('returns manage for a linked Money account card while card state is unresolved', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardStateResolved: false,
        isCardLinkedToMoneyAccount: true,
        isCardAuthenticated: true,
        reportsVerificationStatus: false,
      }),
    ).toBe('manage');
  });

  it('returns upsell for a signed-in cardholder with no provider card', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardStateResolved: false,
        isCardholder: true,
        isCardAuthenticated: true,
        isCardVerified: false,
        hasMoneyAccountRequirements: true,
        reportsVerificationStatus: false,
        hasProviderCard: false,
      }),
    ).toBe('upsell');
  });

  it('returns link once a provider without verification status reports a card', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardholder: false,
        isCardAuthenticated: true,
        isCardVerified: false,
        reportsVerificationStatus: false,
        hasProviderCard: true,
      }),
    ).toBe('link');
  });

  it('returns upsell for an authenticated Money account non-cardholder while card state is unresolved', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardStateResolved: false,
        isCardAuthenticated: true,
        isCardVerified: false,
        isCardholder: false,
        reportsVerificationStatus: false,
      }),
    ).toBe('upsell');
  });

  it('returns null when the money card section is unavailable, even if card state is unresolved', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isMoneyCardSectionAvailable: false,
        isCardStateResolved: false,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: true,
      }),
    ).toBeNull();
  });

  it('prefers loading over manage while card state is unresolved', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardStateResolved: false,
        isCardLinkedToMoneyAccount: true,
      }),
    ).toBe('loading');
  });

  it('returns setup ahead of manage when card setup is unfinished', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: true,
        cardSetupView: { kind: 'action_required', step: 'kyc' },
      }),
    ).toBe('setup');
  });

  it('returns setup ahead of the upsell for an authenticated user', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardAuthenticated: true,
        isCardVerified: false,
        reportsVerificationStatus: false,
        cardSetupView: { kind: 'provisioning' },
      }),
    ).toBe('setup');
  });

  it('keeps loading while card data is unresolved even if setup is unfinished', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardStateResolved: false,
        isCardHomeDataResolved: false,
        isCardAuthenticated: true,
        reportsVerificationStatus: false,
        cardSetupView: { kind: 'kyc_under_review' },
      }),
    ).toBe('loading');
  });

  it('hides the section when it is unavailable even if setup is unfinished', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardAuthenticated: true,
        isMoneyCardSectionAvailable: false,
        cardSetupView: { kind: 'action_required', step: 'funding' },
      }),
    ).toBeNull();
  });

  it('does not show setup for a signed-out user', () => {
    expect(
      deriveMoneyMetaMaskCardMode({
        ...baseInput,
        isCardAuthenticated: false,
        cardSetupView: { kind: 'provisioning' },
      }),
    ).toBe('upsell');
  });
});

describe('deriveMoneyCardSetupView', () => {
  it('returns null when there is no provisioning alert', () => {
    expect(
      deriveMoneyCardSetupView({
        hasProvisioningAlert: false,
        provisioningView: 'provisioning',
        setupStep: 'kyc',
      }),
    ).toBeNull();
  });

  it('returns reconciling while the setup check is in flight', () => {
    expect(
      deriveMoneyCardSetupView({
        hasProvisioningAlert: true,
        provisioningView: 'reconciling',
        setupStep: null,
      }),
    ).toEqual({ kind: 'reconciling' });
  });

  it('returns the identity-review banner', () => {
    expect(
      deriveMoneyCardSetupView({
        hasProvisioningAlert: true,
        provisioningView: 'kyc_under_review',
        setupStep: null,
      }),
    ).toEqual({ kind: 'kyc_under_review' });
  });

  it('returns the card-creation banner', () => {
    expect(
      deriveMoneyCardSetupView({
        hasProvisioningAlert: true,
        provisioningView: 'provisioning',
        setupStep: null,
      }),
    ).toEqual({ kind: 'provisioning' });
  });

  it('returns the step the user still has to finish', () => {
    expect(
      deriveMoneyCardSetupView({
        hasProvisioningAlert: true,
        provisioningView: 'hidden',
        setupStep: 'contact',
      }),
    ).toEqual({ kind: 'action_required', step: 'contact' });
  });

  it('returns null when the provisioning view is hidden and there is no step', () => {
    expect(
      deriveMoneyCardSetupView({
        hasProvisioningAlert: true,
        provisioningView: 'hidden',
        setupStep: null,
      }),
    ).toBeNull();
  });
});

describe('deriveMoneyCardSetupPollIntervalMs', () => {
  it.each(['LOW', 'MID', 'HIGH', null] as const)(
    'does not poll on %s hardware when the network is unusable',
    (hardware) => {
      expect(deriveMoneyCardSetupPollIntervalMs(hardware, 'NONE')).toBeNull();
    },
  );

  it.each(['LOW', 'MID', 'HIGH', null] as const)(
    'polls every 15 seconds on %s hardware over a slow connection',
    (hardware) => {
      expect(
        deriveMoneyCardSetupPollIntervalMs(hardware, 'SLOW_CELLULAR'),
      ).toBe(15_000);
    },
  );

  it.each(['FAST_CELLULAR', 'WIFI', null] as const)(
    'keeps the 5 second poll on a %s network, including unknown hardware',
    (network) => {
      expect(deriveMoneyCardSetupPollIntervalMs(null, network)).toBe(5_000);
      expect(deriveMoneyCardSetupPollIntervalMs('LOW', network)).toBe(5_000);
    },
  );
});
