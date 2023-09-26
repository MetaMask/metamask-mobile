'use strict';
import { Smoke } from '../../tags';
import WalletView from '../../pages/WalletView';
import SendView from '../../pages/SendView';
import AmountView from '../../pages/AmountView';
import TransactionConfirmationView from '../../pages/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import TestHelpers from '../../helpers';

const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(Smoke('Advanced Gas Fees and Priority Tests'), () => {
  let ganache;
  beforeAll(async () => {
    jest.setTimeout(170000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8545'); // ganache
    }
  });

  afterEach(async () => {
    await ganache.quit();
    await TestHelpers.delay(3000);
  });

  it('should edit priority gas settings and send ETH', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async ({ ganacheServer }) => {
        ganache = ganacheServer;
        await loginToApp();

        // Check that we are on the wallet screen
        await WalletView.isVisible();
        //Tap send Icon
        await TabBarComponent.tapActions();
        await WalletActionsModal.tapSendButton();

        await SendView.inputAddress(VALID_ADDRESS);
        await SendView.tapNextButton();
        // Check that we are on the amount view
        await AmountView.isVisible();

        // Input acceptable value
        await AmountView.typeInTransactionAmount('0.00004');
        await AmountView.tapNextButton();

        // Check that we are on the confirm view
        await TransactionConfirmationView.isVisible();

        // Check different gas options
        await TransactionConfirmationView.tapEstimatedGasLink();
        await TransactionConfirmationView.isPriorityEditScreenVisible();
        await TransactionConfirmationView.tapLowPriorityGasOption();
        await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();
        await TransactionConfirmationView.tapMarketPriorityGasOption();
        await TransactionConfirmationView.isMaxPriorityFeeCorrect('1.5');
        await TransactionConfirmationView.tapAggressivePriorityGasOption();
        await TransactionConfirmationView.isMaxPriorityFeeCorrect('2');
        await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();
        await TransactionConfirmationView.tapMaxPriorityFeeSaveButton();
        await TransactionConfirmationView.isVisible();

        // Tap on the send button
        await TransactionConfirmationView.tapConfirmButton();

        // Check that we are on the wallet screen
        await WalletView.isVisible();
      },
    );
  });
});
