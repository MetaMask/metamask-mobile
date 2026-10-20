export type ApplePayHomePromptMode = 'provision' | 'sign_in' | 'none';

export interface ApplePayHomePromptInput {
  isIos: boolean;
  provisioningEnabled: boolean;
  isAuthenticated: boolean;
  isImmersveSession: boolean;
  cardHomeReady: boolean;
  canAddToWallet: boolean;
  inProvisioningCountry: boolean;
  knownAccount: boolean;
}

/**
 * Who sees the wallet-home Apple Pay splash and banner.
 * Signed-in Immersve cardholders see it when the card can still be added.
 * Signed-out users see it in New Zealand when the account is known to Immersve.
 */
export function resolveApplePayHomePrompt({
  isIos,
  provisioningEnabled,
  isAuthenticated,
  isImmersveSession,
  cardHomeReady,
  canAddToWallet,
  inProvisioningCountry,
  knownAccount,
}: ApplePayHomePromptInput): ApplePayHomePromptMode {
  if (!isIos || !provisioningEnabled) {
    return 'none';
  }

  if (isAuthenticated) {
    if (!isImmersveSession || !cardHomeReady) {
      return 'none';
    }
    return canAddToWallet ? 'provision' : 'none';
  }

  if (inProvisioningCountry && knownAccount) {
    return 'sign_in';
  }

  return 'none';
}
