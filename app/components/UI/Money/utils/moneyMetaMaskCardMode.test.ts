import { deriveMoneyMetaMaskCardMode } from './moneyMetaMaskCardMode';

const baseInput = {
  isCardLinkedToMoneyAccount: false,
  isCardholder: false,
  isCardAuthenticated: false,
  isCardVerified: false,
  isResidencyBlocked: false,
  isMoneyAccountVisible: true,
  hasMoneyAccountBaseRequirements: true,
  hasMoneyAccountRequirements: true,
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
});
