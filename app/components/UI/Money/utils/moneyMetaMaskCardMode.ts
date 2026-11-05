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
   * When false, the provider has no Baanx-style verification status. Skip the
   * unresolved loading gate and show the card upsell until the user has a card.
   */
  reportsVerificationStatus?: boolean;
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
  reportsVerificationStatus = true,
}: MoneyMetaMaskCardModeInput): MoneyMetaMaskCardMode | null => {
  if (!isMoneyCardSectionAvailable) {
    return null;
  }

  // A provider with no verification status never resolves the shared gate.
  // Continue to manage, link, or upsell.
  if (!isCardStateResolved && reportsVerificationStatus) {
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
  // A provider that does not report verification offers the card upsell.
  if (isCardAuthenticated) {
    if (!reportsVerificationStatus) {
      return isMoneyAccountVisible ? 'upsell' : null;
    }
    return isMoneyAccountVisible ? 'verifying' : null;
  }

  // Brand-new user -> upsell.
  return isMoneyAccountVisible ? 'upsell' : null;
};
