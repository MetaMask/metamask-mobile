import { Assertions, Utilities } from '../framework';
import TransactionPayConfirmation from '../page-objects/Confirmation/TransactionPayConfirmation';
import FooterActions from '../page-objects/Browser/Confirmations/FooterActions';
import PredictHome from '../page-objects/Predict/PredictHome';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../page-objects/wallet/WalletActionsBottomSheet';

/**
 * Opens Predict Home from wallet via Trade actions.
 * Prefer this over homepage Predictions-section scroll — the section can sit
 * below the short scroll budget or under the tab bar after returning from
 * market details (same shape as openPerpsHomeFromWallet).
 */
export const openPredictHomeFromWallet = async (
  options: { description?: string } = {},
): Promise<void> => {
  await TabBarComponent.tapActions();
  await WalletActionsBottomSheet.tapPredictButton();
  await PredictHome.waitForScreenToDisplay({
    description: options.description ?? 'Predict home should be visible',
  });
};

export const openPredictWithdrawPayConfirmation = async (): Promise<void> => {
  await openPredictHomeFromWallet();
  await PredictHome.expectPrimaryValueVisible();

  await Utilities.executeWithRetry(
    async () => {
      await PredictHome.tapWithdraw();
      await Assertions.expectElementToBeVisible(
        TransactionPayConfirmation.keyboardContainer,
        {
          description: 'Predict withdraw confirmation should be visible',
          timeout: 5000,
        },
      );
    },
    {
      description: 'Open Predict withdraw confirmation',
      interval: 1000,
      timeout: 30000,
    },
  );
};

/**
 * Legacy Safe Predict withdraw (disablePay / withdraw-any-token off).
 *
 * After Done, `confirm-button` stays disabled until the Predict Safe gas-fee-token
 * preflight settles (`usePredictWithdrawGasFeeToken`). Poll review totals first,
 * then confirm with a longer enabled budget than the default 30s FooterActions
 * wait — CI sometimes needs >30s for Sentinel / Safe simulation under load.
 */
export const confirmLegacyPredictWithdraw = async (
  amount = '5',
  confirmTimeoutMs = 60_000,
): Promise<void> => {
  await TransactionPayConfirmation.enterAmountAndContinue(amount);

  await Assertions.expectElementToExist(TransactionPayConfirmation.total, {
    timeout: 30_000,
    description: 'Predict withdraw review totals after amount commit',
  });

  await FooterActions.tapConfirmButton(confirmTimeoutMs);
};
