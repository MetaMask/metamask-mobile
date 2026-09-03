import { createSelector } from 'reselect';
import { selectShouldShowWalletHomeOnboardingSteps } from '../../../../selectors/onboarding';
import { selectAccountGroupBalanceForEmptyState } from '../../../../selectors/assets/balances';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { TEST_NETWORK_IDS } from '../../../../constants/network';

/**
 * Whether Wallet Home is already presenting a primary funding CTA outside the
 * Money balance card — either the post-onboarding checklist or the
 * "Fund your wallet" empty-state NBA (shown when the aggregated mainnet balance
 * is zero on a non-test network).
 *
 * Both surfaces derive from the same balance/onboarding state that drives
 * `BalanceEmptyState` and `WalletHomeOnboardingSteps`, so this stays in sync
 * with what Home actually renders. The Money balance card consumes it to drop
 * its "Add" button from Primary to Secondary, so Home never shows two competing
 * primary CTAs at once.
 */
export const selectHasWalletFundingPrimaryCta = createSelector(
  [
    selectShouldShowWalletHomeOnboardingSteps,
    selectAccountGroupBalanceForEmptyState,
    selectEvmChainId,
  ],
  (isOnboardingChecklistVisible, accountGroupBalance, selectedChainId) =>
    isOnboardingChecklistVisible ||
    (accountGroupBalance != null &&
      accountGroupBalance.totalBalanceInUserCurrency === 0 &&
      !TEST_NETWORK_IDS.includes(selectedChainId)),
);
