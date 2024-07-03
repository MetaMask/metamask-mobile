'use strict';
import { SmokeConfirmations } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import { AmountViewSelectorsText } from '../../selectors/SendFlow/AmountView.selectors';

const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(SmokeConfirmations('Advanced Gas Fees and Priority Tests'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('should edit priority gas settings and send ETH', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withSepoliaNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        // Check that we are on the wallet screen
        await Assertions.checkIfVisible(WalletView.container);

        //Tap send Icon
        await TestHelpers.delay(2000);
        await TabBarComponent.tapActions();
        await TestHelpers.delay(2000);
        await WalletActionsModal.tapSendButton();

        await SendView.inputAddress(VALID_ADDRESS);
        await SendView.tapNextButton();
        // Check that we are on the amount view
        await Assertions.checkIfTextIsDisplayed(
          AmountViewSelectorsText.SCREEN_TITLE,
        );

        // Input acceptable value
        await AmountView.typeInTransactionAmount('0.00004');
        await AmountView.tapNextButton();

        // Check that we are on the confirm view
        await Assertions.checkIfVisible(
          TransactionConfirmationView.transactionViewContainer,
        );

        // Check different gas options
        await TransactionConfirmationView.tapEstimatedGasLink();
        await Assertions.checkIfVisible(
          TransactionConfirmationView.editPriorityFeeSheetContainer,
        );
        await TransactionConfirmationView.tapLowPriorityGasOption();
        await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();
        await TransactionConfirmationView.tapMarketPriorityGasOption();
        await Assertions.checkIfTextIsDisplayed('1.5');
        await TransactionConfirmationView.tapAggressivePriorityGasOption();
        await Assertions.checkIfTextIsDisplayed('2');

        await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();
        await TransactionConfirmationView.tapMaxPriorityFeeSaveButton();
        await Assertions.checkIfVisible(
          TransactionConfirmationView.transactionViewContainer,
        );
        // Tap on the send button
        await TransactionConfirmationView.tapConfirmButton();

        // Check that we are on the wallet screen
        await Assertions.checkIfVisible(WalletView.container);
      },
    );
  });
});
