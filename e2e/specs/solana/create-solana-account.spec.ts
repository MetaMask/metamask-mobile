import { SmokeNetworkExpansion } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Assertions from '../../framework/Assertions';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import RevealPrivateKey from '../../pages/Settings/SecurityAndPrivacy/RevealPrivateKeyView';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import EditAccountName from '../../pages/MultichainAccounts/EditAccountName';

const ACCOUNT_ONE_TEXT = 'Solana Account 1';
const ACCOUNT_TWO_TEXT = 'Solana Account 2';
const NEW_ACCOUNT_NAME = 'Solana Account New Name';
const PASSWORD = '123123123';

describe(SmokeNetworkExpansion('Create Solana account'), () => {
  it('should create two Solana accounts from the bottom sheet', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withSolanaFixture().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
        );

        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapAddSolanaAccount();
        await AddNewHdAccountComponent.tapConfirm();
        await Assertions.expectTextDisplayed(ACCOUNT_ONE_TEXT);

        // Create a second account
        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
        );

        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapAddSolanaAccount();
        await AddNewHdAccountComponent.tapConfirm();
        await Assertions.expectTextDisplayed(ACCOUNT_TWO_TEXT);

        // Switch Between Accounts
        //Switch back to first solana account
        await WalletView.tapIdenticon();

        // Select first Solana
        await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(1);
        //Assert solana account 1 on main wallet view
        await Assertions.expectTextDisplayed(ACCOUNT_ONE_TEXT);
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(2);
        //Assert solana account 2 on main wallet view
        await Assertions.expectTextDisplayed(ACCOUNT_TWO_TEXT);
      },
    );
  });

  it('should be able to rename Solana account', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withSolanaFixture().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapIdenticon();

        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapAddSolanaAccount();
        await AddNewHdAccountComponent.tapConfirm();

        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapEditAccountActionsAtIndex(1);
        await AccountDetails.tapEditAccountName();
        await EditAccountName.updateAccountName(NEW_ACCOUNT_NAME);
        await EditAccountName.tapSave();
        await Assertions.expectTextDisplayed(NEW_ACCOUNT_NAME);
        await AccountDetails.tapBackButton();
        await WalletView.tapIdenticon();
        await Assertions.expectTextDisplayed(NEW_ACCOUNT_NAME);
      },
    );
  });

  // This test needs to be moved to use fixtures
  it.skip('should be able to reveal private key of created solana account', async () => {
    // Create a Solana account to reveal the private key for
    await WalletView.tapIdenticon();
    await Assertions.expectElementToBeVisible(
      AccountListBottomSheet.accountList,
    );
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapAddSolanaAccount();
    await AddNewHdAccountComponent.tapConfirm();
    await Assertions.expectTextDisplayed(ACCOUNT_TWO_TEXT, {
      allowDuplicates: true,
    });

    // Access the account actions and reveal private key
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapEditAccountActionsAtIndex(2);
    await AccountActionsBottomSheet.tapShowPrivateKey();
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      PASSWORD,
    );

    // Tap the reveal button to show the private key
    await RevealPrivateKey.tapToReveal();

    await Assertions.expectElementToBeVisible(RevealPrivateKey.privateKey);
    await RevealPrivateKey.tapToCopyCredentialToClipboard();
    await RevealPrivateKey.tapDoneButton();
  });

  //TODO: Waiting for removal feature to be implemented PLACEHOLDER
  it.skip('should remove a solana account after creation', async () => {
    // Test to be implemented when removal feature is available
  });
});
