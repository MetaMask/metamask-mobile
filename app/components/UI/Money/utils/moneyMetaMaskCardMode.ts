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
  /** Card home data has settled. Used when the provider has no verification status. */
  isCardHomeDataResolved: boolean;
  isMoneyCardSectionAvailable?: boolean;
  /**
   * When false, the provider has no Baanx-style verification status. Wait for
   * card home data, then continue without a verification-status wait.
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
  isCardHomeDataResolved,
  isMoneyCardSectionAvailable = true,
  reportsVerificationStatus = true,
}: MoneyMetaMaskCardModeInput): MoneyMetaMaskCardMode | null => {
  if (!isMoneyCardSectionAvailable) {
    return null;
  }

  const isResolved = reportsVerificationStatus
    ? isCardStateResolved
    : isCardHomeDataResolved;
  if (!isResolved) {
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
