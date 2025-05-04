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
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import RevealPrivateKey from '../../pages/Settings/SecurityAndPrivacy/RevealPrivateKeyView.js';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import SolanaNewFeatureSheet from '../../pages/wallet/SolanaNewFeatureSheet';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import EditAccountNameView from '../../pages/wallet/EditAccountNameView';

const ACCOUNT_ONE_TEXT = 'Solana Account 1';
const ACCOUNT_TWO_TEXT = 'Solana Account 2';
const NEW_ACCOUNT_NAME = 'Solana Account New Name';
const PASSWORD = '123123123';

const fixtureServer = new FixtureServer();

describe(SmokeConfirmations('Create Solana account'), () => {
  beforeAll(async () => {
    jest.setTimeout(10000);
    await TestHelpers.reverseServerPort();

    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, {
      fixture: new FixtureBuilder().withSolanaFixture().build(),
    });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: getFixturesServerPort() },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should assert the new Solanafeature announcement sheet', async () => {
    await Assertions.checkIfVisible(
      SolanaNewFeatureSheet.verifySheetIsVisible(),
    );
    await Assertions.checkIfVisible(
      SolanaNewFeatureSheet.verifyLearnMoreButtonIsVisible(),
    );
    await Assertions.checkIfVisible(
      SolanaNewFeatureSheet.verifyAddAccountButtonIsVisible(),
    );
    await Assertions.checkIfVisible(
      SolanaNewFeatureSheet.verifyCreateAccountButtonIsVisible(),
    );
  });

  it('should create Solana account directly from new feature announcement sheet', async () => {
    await SolanaNewFeatureSheet.tapCreateAccountButton();
    await SolanaNewFeatureSheet.tapAddAccountButton();
    await WalletView.tapIdenticon();
    // Check if the Solana account is created
    await Assertions.checkIfTextRegexExists(ACCOUNT_ONE_TEXT, 1);
  });

  it('should create another Solana account from the bottom sheet', async () => {
    await AccountListBottomSheet.tapAddAccountButton();
    await AddNewHdAccountComponent.assertContainerIsVisible();
    await AddAccountBottomSheet.tapAddSolanaAccount();
    await AddNewHdAccountComponent.tapConfirm();
    await Assertions.checkIfTextRegexExists(ACCOUNT_TWO_TEXT, 2);
  });

  it('should should be able to switch between solana accounts', async () => {
    //Switch back to first solana account
    await WalletView.tapIdenticon();
    // Select first Solana 
    await AccountListBottomSheet.tapAccountOffCenter(1, 0.5, 0.5);
    //Assert solana account 1 on main wallet view
    await Assertions.checkIfTextRegexExists(ACCOUNT_ONE_TEXT, 0);

    //Switch to second solana account
    await WalletView.tapIdenticon();
    // Select second Solana 
    await AccountListBottomSheet.tapAccountOffCenter(2, 0.5, 0.5);
    //Assert solana account 2 on main wallet view
    await Assertions.checkIfTextRegexExists(ACCOUNT_TWO_TEXT, 0);
  });

  it('should be able to rename Solana account', async () => {
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapEditAccountActionsAtIndex(2);
    await AccountActionsBottomSheet.tapEditAccount();
    await EditAccountNameView.updateAccountName(NEW_ACCOUNT_NAME);
    await EditAccountNameView.tapSave();
    await Assertions.checkIfTextRegexExists(NEW_ACCOUNT_NAME, 0);
  });

  it.skip('should be able to reveal private key of created solana account', async () => {
    // Create a Solana account to reveal the private key for
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapAddSolanaAccount();
    await AddNewHdAccountComponent.tapConfirm();
    await Assertions.checkIfTextRegexExists(ACCOUNT_TWO_TEXT, 2);
    
    // Access the account actions and reveal private key
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapEditAccountActionsAtIndex(2);
    await AccountActionsBottomSheet.tapShowPrivateKey();
    
    // Enter password to reveal the private key
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      PASSWORD
    );
    
    // Tap the reveal button to show the private key
    await RevealPrivateKey.tapToReveal();
    
    // Verify that the private key is displayed
    await Assertions.checkIfVisible(RevealPrivateKey.privateKey);
    
    // Optional: Copy to clipboard and/or close the view
    await RevealPrivateKey.tapToCopyCredentialToClipboard();
    await RevealPrivateKey.tapDoneButton();
  });

  //TODO: Waiting for removal feature to be implemented PLACEHOLDER
  it.skip('should remove a solana account after creation', async () => {
   
  });
});
