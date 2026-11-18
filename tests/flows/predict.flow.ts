import { Assertions, Utilities } from '../framework';
import TransactionPayConfirmation from '../page-objects/Confirmation/TransactionPayConfirmation';
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
