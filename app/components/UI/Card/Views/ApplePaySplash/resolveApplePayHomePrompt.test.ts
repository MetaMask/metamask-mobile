import { resolveApplePayHomePrompt } from './resolveApplePayHomePrompt';

const ready = {
  isIos: true,
  provisioningEnabled: true,
  isAuthenticated: false,
  isImmersveSession: false,
  cardHomeReady: false,
  canAddToWallet: false,
  inProvisioningCountry: true,
  knownAccount: true,
};

describe('resolveApplePayHomePrompt', () => {
  it('asks a known New Zealand account to sign in', () => {
    expect(resolveApplePayHomePrompt(ready)).toBe('sign_in');
  });

  it('stays hidden outside New Zealand', () => {
    expect(
      resolveApplePayHomePrompt({ ...ready, inProvisioningCountry: false }),
    ).toBe('none');
  });

  it('stays hidden when the account is not known', () => {
    expect(resolveApplePayHomePrompt({ ...ready, knownAccount: false })).toBe(
      'none',
    );
  });

  it('stays hidden when the Immersve Apple Pay flag is off', () => {
    expect(
      resolveApplePayHomePrompt({ ...ready, provisioningEnabled: false }),
    ).toBe('none');
  });

  it('starts provisioning for a signed-in card that can still be added', () => {
    expect(
      resolveApplePayHomePrompt({
        ...ready,
        isAuthenticated: true,
        isImmersveSession: true,
        cardHomeReady: true,
        canAddToWallet: true,
        inProvisioningCountry: false,
        knownAccount: false,
      }),
    ).toBe('provision');
  });

  it('stays hidden when the signed-in card is already on every device', () => {
    expect(
      resolveApplePayHomePrompt({
        ...ready,
        isAuthenticated: true,
        isImmersveSession: true,
        cardHomeReady: true,
        canAddToWallet: false,
      }),
    ).toBe('none');
  });

  it('waits until card home data is ready', () => {
    expect(
      resolveApplePayHomePrompt({
        ...ready,
        isAuthenticated: true,
        isImmersveSession: true,
        cardHomeReady: false,
        canAddToWallet: true,
      }),
    ).toBe('none');
  });
});
