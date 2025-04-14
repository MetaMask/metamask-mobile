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
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import RevealPrivateKey from '../../pages/Settings/SecurityAndPrivacy/RevealPrivateKeyView.js';

const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';
const ACCOUNT_ONE_TEXT = 'Solana Account 1';
const ACCOUNT_TWO_TEXT = 'Solana Account 2';
const PASSWORD = '123123123';

describe.only(SmokeConfirmations('Create Solana account'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it.only('should be able to create multiple solana accounts and switch between them', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withDefaultFixture()
          .withSolanaNetwork()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await Assertions.checkIfVisible(WalletView.container);
        await WalletView.tapIdenticon();
        await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateSolanaAccount();
        await Assertions.checkIfTextRegexExists(ACCOUNT_ONE_TEXT, 1);
        await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(1);
        //Assert solana account on main wallet view
        await Assertions.checkIfTextRegexExists(ACCOUNT_ONE_TEXT, 0);

        //Create second solana account
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateSolanaAccount();
        await Assertions.checkIfTextRegexExists(ACCOUNT_TWO_TEXT, 1);
        await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(2);

        //Assert solana account on main wallet view
        await Assertions.checkIfTextRegexExists(ACCOUNT_TWO_TEXT, 0);

        //Switch back to first solana account
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(1);
        //Assert solana account on main wallet view
        await Assertions.checkIfTextRegexExists(ACCOUNT_ONE_TEXT, 0);
      },
    );
  });

  // TODO: This test is failing because the private key is not being revealed and feature is not implemented
  it.skip('should be able to reveal private key of created solana account', async () => {
    await loginToApp();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapCreateSolanaAccount();
    await Assertions.checkIfTextRegexExists(ACCOUNT_ONE_TEXT, 1);
    // attempt to reveal private key
    await AccountListBottomSheet.tapEditAccountActionsAtIndex(1);
    await AccountActionsBottomSheet.tapShowPrivateKey();
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      PASSWORD,
    );
    await RevealPrivateKey.tapToReveal();
  });

  //TODO: Waiting for removal feature to be implemented
  it.skip('should remove a solana account after creation', async () => {
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
        await AccountListBottomSheet.tapEditAccountActionsAtIndex(1);
        await AccountActionsBottomSheet.tapRemoveAccount();
        
      },
    );
  });
});
