import { SmokeConfirmations } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import AmountView from '../../pages/Send/AmountView';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import Assertions from '../../framework/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';

const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';
const testSpecificMock = {
  GET: [
    mockEvents.GET.suggestedGasFeesApiGanache,
    mockEvents.GET.remoteFeatureFlagsOldConfirmations,
  ],
};

describe(SmokeConfirmations('Advanced Gas Fees and Priority Tests'), () => {
  it('should edit priority gas settings and send ETH', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        // Check that we are on the wallet screen
        await Assertions.expectElementToBeVisible(WalletView.container);

        //Tap send Icon
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();

        await SendView.inputAddress(VALID_ADDRESS);
        await SendView.tapNextButton();
        // Check that we are on the amount view
        await Assertions.expectElementToBeVisible(AmountView.title);

        // Input acceptable value
        await AmountView.typeInTransactionAmount('0.00004');
        await AmountView.tapNextButton();

        // Check that we are on the confirm view
        await Assertions.expectElementToBeVisible(
          TransactionConfirmationView.transactionViewContainer,
        );

        // Check different gas options
        await TransactionConfirmationView.tapEstimatedGasLink();
        await Assertions.expectElementToBeVisible(
          TransactionConfirmationView.editPriorityFeeSheetContainer,
        );
        await TransactionConfirmationView.tapLowPriorityGasOption();
        await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();
        await TransactionConfirmationView.tapMarketPriorityGasOption();
        await Assertions.expectTextDisplayed('1.5');
        await TransactionConfirmationView.tapAggressivePriorityGasOption();
        await Assertions.expectTextDisplayed('2');

        await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();
        await TransactionConfirmationView.tapMaxPriorityFeeSaveButton();
        await Assertions.expectElementToBeVisible(
          TransactionConfirmationView.transactionViewContainer,
        );
        // Tap on the send button
        await TransactionConfirmationView.tapConfirmButton();

        // Check that we are on the Activities View
        await Assertions.expectElementToBeVisible(ActivitiesView.container);
      },
    );
  });
});
