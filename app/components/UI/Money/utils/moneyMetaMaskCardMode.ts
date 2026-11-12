import type { CardProvisioningView, CardSetupStep } from '../../Card/types';
import type { HardwareTier } from '../../../../util/deviceCapability';
import type { NetworkTier } from '../../../../hooks/useNetworkTier';

export type MoneyMetaMaskCardMode =
  | 'upsell'
  | 'link'
  | 'manage'
  | 'verifying'
  | 'loading'
  | 'setup';

export type MoneyCardSetupView =
  | { kind: 'reconciling' }
  | { kind: 'kyc_under_review' }
  | { kind: 'provisioning' }
  | { kind: 'action_required'; step: CardSetupStep };

const CARD_SETUP_POLL_INTERVAL_MS = 5_000;
const CARD_SETUP_SLOW_POLL_INTERVAL_MS = 15_000;

export function deriveMoneyCardSetupPollIntervalMs(
  _hardware: HardwareTier | null,
  network: NetworkTier | null,
): number | null {
  if (network === 'NONE') {
    return null;
  }

  if (network === 'SLOW_CELLULAR') {
    return CARD_SETUP_SLOW_POLL_INTERVAL_MS;
  }

  return CARD_SETUP_POLL_INTERVAL_MS;
}

export function deriveMoneyCardSetupView({
  hasProvisioningAlert,
  provisioningView,
  setupStep,
}: {
  hasProvisioningAlert: boolean;
  provisioningView: CardProvisioningView;
  setupStep: CardSetupStep | null;
}): MoneyCardSetupView | null {
  if (!hasProvisioningAlert) {
    return null;
  }

  if (provisioningView === 'reconciling') {
    return { kind: 'reconciling' };
  }

  if (provisioningView === 'kyc_under_review') {
    return { kind: 'kyc_under_review' };
  }

  if (setupStep) {
    return { kind: 'action_required', step: setupStep };
  }

  if (provisioningView === 'provisioning') {
    return { kind: 'provisioning' };
  }

  return null;
}

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
  /** The last card home fetch failed. Unresolved means nothing is cached. */
  hasCardHomeDataFailed: boolean;
  isMoneyCardSectionAvailable?: boolean;
  /**
   * When false, the provider has no Baanx-style verification status. Wait for
   * card home data, then continue without a verification-status wait.
   */
  reportsVerificationStatus?: boolean;
  cardSetupView?: MoneyCardSetupView | null;
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
  hasCardHomeDataFailed,
  isMoneyCardSectionAvailable = true,
  reportsVerificationStatus = true,
  cardSetupView = null,
}: MoneyMetaMaskCardModeInput): MoneyMetaMaskCardMode | null => {
  if (!isMoneyCardSectionAvailable) {
    return null;
  }

  const isResolved = reportsVerificationStatus
    ? isCardStateResolved
    : isCardHomeDataResolved;
  if (!isResolved) {
    // A failed first fetch stays 'error' for the freshness window, and the
    // automatic retry never fires again. Hide the section instead of spinning.
    if (!reportsVerificationStatus && hasCardHomeDataFailed) {
      return null;
    }
    return isMoneyAccountVisible ? 'loading' : null;
  }

  if (isCardAuthenticated && cardSetupView) {
    return 'setup';
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
