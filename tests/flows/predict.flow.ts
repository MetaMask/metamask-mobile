import { Assertions, Utilities } from '../framework';
import TransactionPayConfirmation from '../page-objects/Confirmation/TransactionPayConfirmation';
import PredictHome from '../page-objects/Predict/PredictHome';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../page-objects/wallet/WalletActionsBottomSheet';

export const openPredictWithdrawPayConfirmation = async (): Promise<void> => {
  await TabBarComponent.tapActions();
  await WalletActionsBottomSheet.tapPredictButton();
  await PredictHome.waitForScreenToDisplay({
    description: 'Predict home should be visible',
  });
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
