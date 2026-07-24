import { Assertions, Utilities } from '../framework';
import TransactionPayConfirmation from '../page-objects/Confirmation/TransactionPayConfirmation';
import PredictBalance from '../page-objects/Predict/PredictBalance';
import PredictMarketList from '../page-objects/Predict/PredictMarketList';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../page-objects/wallet/WalletActionsBottomSheet';

export const openPredictWithdrawPayConfirmation = async (): Promise<void> => {
  await TabBarComponent.tapActions();
  await WalletActionsBottomSheet.tapPredictButton();
  await PredictMarketList.waitForScreenToDisplay({
    description: 'Predict market list should be visible',
  });
  await PredictBalance.expectBalanceCardVisible();

  await Utilities.executeWithRetry(
    async () => {
      await PredictBalance.tapWithdraw();
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
