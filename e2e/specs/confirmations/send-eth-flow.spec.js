'use strict';

import { Confirmations } from '../../tags';
import TestHelpers from '../../helpers';
import AmountView from '../../pages/AmountView';
import SendView from '../../pages/SendView';
import TransactionConfirmationView from '../../pages/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';

const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';

describe(Confirmations('Send ETH Tests'), () => {
  let ganache;

  beforeAll(async () => {
    jest.setTimeout(150000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8545'); // ganache
    }
  });

  afterEach(async () => {
    await ganache.quit();
    await TestHelpers.delay(3000);
  });

  it('should send ETH to an EOA', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async ({ ganacheServer }) => {
        ganache = ganacheServer;
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsModal.tapSendButton();
        // Make sure view with my accounts visible
        await SendView.isMyAccountsVisisble();

        await SendView.inputAddress(MYTH_ADDRESS);
        await SendView.noEthWarningMessageIsVisible();
        await SendView.tapNextButton();
        // Check that we are on the amount view
        await AmountView.isVisible();

        await AmountView.typeInTransactionAmount('0.004');
        await TestHelpers.delay(2500);

        await AmountView.tapCurrencySwitch();
        await TestHelpers.delay(2500); // android is running a bit quicker and it is having a hard time asserting that the text is visible.
        await AmountView.isTransactionAmountConversionValueCorrect('0.004 ETH');
        await TestHelpers.delay(4000);
        await AmountView.tapCurrencySwitch();
        await TestHelpers.delay(2500);

        await AmountView.isTransactionAmountCorrect('0.004');

        // Type in a non numeric value
        await AmountView.typeInTransactionAmount('0xA');
        // Click next and check that error is shown
        await TestHelpers.delay(3000);
        await AmountView.tapNextButton();
        await AmountView.isAmountErrorVisible();
        // Type in a negative value
        await AmountView.typeInTransactionAmount('-10');
        // Click next and check that error is shown
        await AmountView.tapNextButton();
        await AmountView.isAmountErrorVisible();
        // Input acceptable value
        await AmountView.typeInTransactionAmount('0.00001');
        await AmountView.tapNextButton();

        // Check that we are on the confirm view
        await TransactionConfirmationView.isVisible();

        await TestHelpers.delay(2000);

        // Check that the amount is correct
        await TransactionConfirmationView.isTransactionTotalCorrect(
          '0.00001 ETH',
        );
        // Tap on the Send CTA
        await TransactionConfirmationView.tapConfirmButton();
        // Check that we are on the wallet screen
        //await WalletView.isVisible();
      },
    );
  });
});
