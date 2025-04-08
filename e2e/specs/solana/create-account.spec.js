'use strict';
import { SmokeConfirmations } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import AmountView from '../../pages/Send/AmountView';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Gestures from '../../utils/Gestures';
// import CreateAccountView from '../../pages/wallet/CreateAccountView';
//import AccountOverviewScreen from '../../pages/wallet/AccountOverviewScreen';

const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';
const ACCOUNT_ONE_TEXT = 'Solana Account 1';
const ACCOUNT_TWO_TEXT = 'Solana Account 2';

describe(SmokeConfirmations('Create Solana account'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it.only('should be able to create a solana account', async () => {

    await withFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().withSolanaNetwork().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Check that we are on the wallet screen
        await Assertions.checkIfVisible(WalletView.container);
        await WalletView.tapIdenticon();
        await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateSolanaAccount();
        //await Assertions.checkIfTextIsDisplayed('You have switched to');
        //await Assertions.checkIfTextIsDisplayed('The native asset on this network is SOL. It is used for transaction fees.');
        //await Assertions.checkIfTextIsDisplayed('You will loose your assets if you try to send from or to another network.');
        //await Gestures.tapTextBeginingWith('Got it');
        await Assertions.checkIfVisible(
          AccountListBottomSheet.accountNameInList(ACCOUNT_ONE_TEXT),
        );
        await TabBarComponent.tapWallet();
        await Assertions.checkIfElementHasString(WalletView.accountName, ACCOUNT_ONE_TEXT);
      },
    );
  });

  it('should remove a solana account after creation', async () => {

    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        // Check that we are on the wallet screen
        await Assertions.checkIfVisible(WalletView.container);
        await WalletView.tapIdenticon();
        await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateSolanaAccount();
 // Enter account name
       /* await CreateAccountView.typeAccountName('Solana Test Wallet');
        await CreateAccountView.tapCreateButton();*/

 // Verify account was created successfully
        await TestHelpers.delay(1000);
        //await Assertions.checkIfVisible(AccountOverviewScreen.accountNameLabel);
        //await Assertions.checkIfElementHasString(AccountOverviewScreen.accountNameLabel, 'Solana Test Wallet');

 // Verify account persists after navigation
        await TabBarComponent.tapWallet();
        await TestHelpers.delay(1000);
        await Assertions.checkIfElementHasString(WalletView.accountName, 'Solana Test Wallet');

      },
    );
  });
});
