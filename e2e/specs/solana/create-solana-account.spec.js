'use strict';
import { SmokeNetworkExpansion } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
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

describe(SmokeNetworkExpansion('Create Solana account'), () => {
  beforeAll(async () => {
    jest.setTimeout(10000);
    await TestHelpers.reverseServerPort();
    await TestHelpers.delay(4000);

    await startFixtureServer(fixtureServer);
    await TestHelpers.delay(4000);

    await loadFixture(fixtureServer, {
      fixture: new FixtureBuilder()
        .withSolanaFixture()
        .withSolanaFeatureSheetDisplayed()
        .build(),
    });

    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: getFixturesServerPort() },
    });

    await loginToApp();
    await TestHelpers.delay(4000);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should create Solana account directly from new feature announcement sheet', async () => {
    await Assertions.checkIfVisible(
      SolanaNewFeatureSheet.sheetContainer,
    );
    await Assertions.checkIfVisible(
      SolanaNewFeatureSheet.learnMoreButton,
    );
    await SolanaNewFeatureSheet.tapCreateAccountButton();
    await AddNewHdAccountComponent.tapConfirm();
    await TestHelpers.delay(4000);
    await WalletView.tapIdenticon();
    // Check if the Solana account is created
    await Assertions.checkIfTextIsDisplayed(ACCOUNT_ONE_TEXT);
  });

  it('should create another Solana account from the bottom sheet', async () => {
    await AccountListBottomSheet.tapAddAccountButton();
    await TestHelpers.delay(4000);
    await AddAccountBottomSheet.tapAddSolanaAccount();
    await AddNewHdAccountComponent.tapConfirm();
    await TestHelpers.delay(4000);
    await Assertions.checkIfTextIsDisplayed(ACCOUNT_TWO_TEXT);
  });

  it('should be able to switch between solana accounts', async () => {
    //Switch back to first solana account
    await TestHelpers.delay(4000);
    await WalletView.tapIdenticon();

    // Select first Solana
    await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(1);
    //Assert solana account 1 on main wallet view
    await Assertions.checkIfTextIsDisplayed(ACCOUNT_ONE_TEXT);
    // await TestHelpers.delay(4000);
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(2);
    //Assert solana account 2 on main wallet view
    await Assertions.checkIfTextIsDisplayed(ACCOUNT_TWO_TEXT);
  });

  it('should be able to rename Solana account', async () => {
    await TestHelpers.delay(4000);
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapEditAccountActionsAtIndex(2);
    await AccountActionsBottomSheet.tapEditAccount();
    await EditAccountNameView.updateAccountName(NEW_ACCOUNT_NAME);
    await EditAccountNameView.tapSave();
    await TestHelpers.delay(4000);
    await WalletView.tapIdenticon();

    await Assertions.checkIfTextIsDisplayed(NEW_ACCOUNT_NAME);
  });

  it.skip('should be able to reveal private key of created solana account', async () => {
    // Create a Solana account to reveal the private key for
    await WalletView.tapId;
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapAddSolanaAccount();
    await AddNewHdAccountComponent.tapConfirm();
    await Assertions.checkIfTextIsDisplayed(ACCOUNT_TWO_TEXT, 2);

    // Access the account actions and reveal private key
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapEditAccountActionsAtIndex(2);
    await AccountActionsBottomSheet.tapShowPrivateKey();
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      PASSWORD,
    );

    // Tap the reveal button to show the private key
    await RevealPrivateKey.tapToReveal();

    await Assertions.checkIfVisible(RevealPrivateKey.privateKey);
    await RevealPrivateKey.tapToCopyCredentialToClipboard();
    await RevealPrivateKey.tapDoneButton();
  });

  //TODO: Waiting for removal feature to be implemented PLACEHOLDER
  it.skip('should remove a solana account after creation', async () => {
    // Test to be implemented when removal feature is available
  });
});
