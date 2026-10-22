export type MoneyMetaMaskCardMode =
  | 'upsell'
  | 'link'
  | 'manage'
  | 'verifying'
  | 'loading';

export interface MoneyMetaMaskCardModeInput {
  isCardLinkedToMoneyAccount: boolean;
  isCardholder: boolean;
  isCardAuthenticated: boolean;
  isCardVerified: boolean;
  isResidencyBlocked: boolean;
  isMoneyAccountVisible: boolean;
  hasMoneyAccountBaseRequirements: boolean;
  hasMoneyAccountRequirements: boolean;
  isCardStateResolved: boolean;
  isMoneyCardSectionAvailable?: boolean;
  /**
   * Immersve never reports Baanx VERIFIED, so card state never resolves via
   * verificationStatus. Skip the unresolved loading gate for NZ Money account
   * users and show upsell (not the verification banner) until they have a card.
   */
  isImmersveMoneyAccountMode?: boolean;
}

export const deriveMoneyMetaMaskCardMode = ({
  isCardLinkedToMoneyAccount,
  isCardholder,
  isCardAuthenticated,
  isCardVerified,
  isResidencyBlocked,
  isMoneyAccountVisible,
  hasMoneyAccountBaseRequirements,
  hasMoneyAccountRequirements,
  isCardStateResolved,
  isMoneyCardSectionAvailable = true,
  isImmersveMoneyAccountMode = false,
}: MoneyMetaMaskCardModeInput): MoneyMetaMaskCardMode | null => {
  if (!isMoneyCardSectionAvailable) {
    return null;
  }

  // Immersve never supplies Baanx verificationStatus, so the shared
  // unresolved-state gate would spin forever. Continue to manage/link/upsell.
  if (!isCardStateResolved && !isImmersveMoneyAccountMode) {
    return isMoneyAccountVisible ? 'loading' : null;
  }

  // Card already linked to the Money account -> manage it.
  if (isCardLinkedToMoneyAccount) return 'manage';

  // Cardholder who hasn't authenticated yet -> offer to link (needs base reqs).
  if (isCardholder && !isCardAuthenticated) {
    return hasMoneyAccountBaseRequirements ? 'link' : null;
  }

  // Residency-blocked users can't link.
  if (isResidencyBlocked) return null;

  // Cardholder or a verified authenticated user -> offer to link (needs full reqs).
  if (isCardholder || (isCardAuthenticated && isCardVerified)) {
    return hasMoneyAccountRequirements ? 'link' : null;
  }

  // Authenticated but identity not yet verified -> verification in progress.
  // Immersve NZ has no Baanx verification state; show the card upsell instead.
  if (isCardAuthenticated) {
    if (isImmersveMoneyAccountMode) {
      return isMoneyAccountVisible ? 'upsell' : null;
    }
    return isMoneyAccountVisible ? 'verifying' : null;
  }

  // Brand-new user -> upsell.
  return isMoneyAccountVisible ? 'upsell' : null;
};
