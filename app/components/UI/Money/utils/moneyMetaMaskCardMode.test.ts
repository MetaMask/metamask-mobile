import { deriveMoneyMetaMaskCardMode } from './moneyMetaMaskCardMode';

const baseInput = {
  isCardLinkedToMoneyAccount: false,
  isCardholder: false,
  isCardAuthenticated: false,
  isCardVerified: false,
  isResidencyBlocked: false,
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
