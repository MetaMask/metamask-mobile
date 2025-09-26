import { RegressionAccounts } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import Assertions from '../../framework/Assertions';
import RevealPrivateKey from '../../pages/Settings/SecurityAndPrivacy/RevealPrivateKeyView';
import { RevealSeedViewSelectorsText } from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import { Mockttp } from 'mockttp';
import { remoteFeatureMultichainAccountsAccountDetails } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

// These keys are from the fixture and are used to test the reveal private key functionality
const HD_ACCOUNT_1_PRIVATE_KEY =
  '242251a690016cfcf8af43fb1ad7ff4c66c269bbca03f9f076ee8db93c191594';
const IMPORTED_ACCOUNT_2_PRIVATE_KEY =
  'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';
const IMPORTED_ACCOUNT_0_INDEX = 0;
const IMPORTED_ACCOUNT_1_INDEX = 1;

describe(RegressionAccounts('reveal private key'), () => {
  const PASSWORD = '123123123';
  const INCORRECT_PASSWORD = 'wrongpassword';

  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      remoteFeatureMultichainAccountsAccountDetails(false),
    );
  };

  it('reveals the correct private key for selected hd account from settings', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedAccountKeyringController()
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        // Navigate to Reveal private key screen
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacy.scrollToRevealPrivateKey();
        await SecurityAndPrivacy.tapShowPrivateKeyButton();
        await RevealPrivateKey.enterPasswordToRevealSecretCredential(PASSWORD);

        // Tap to reveal
        // If the following step fails, ensure you are using a test build with tap and hold to reveal animation disabled
        await RevealPrivateKey.tapToReveal();

        // Confirm that the private key container, title, and text are displayed
        await Assertions.expectElementToBeVisible(RevealPrivateKey.container);
        await Assertions.expectTextDisplayed(
          RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_PRIVATE_KEY_TITLE_TEXT,
          {
            description: 'Reveal private key title',
          },
        );
        await Assertions.expectTextDisplayed(HD_ACCOUNT_1_PRIVATE_KEY);

        // Copy to clipboard
        // Android devices running OS version < 11 (API level 29) will not see the copy to clipboard button presented
        // This will cause the following step to fail if e2e were being run on an older android OS prior to our minimum API level 29
        // See details here: https://github.com/MetaMask/metamask-mobile/pull/4170
        await RevealPrivateKey.tapToCopyCredentialToClipboard();
        await RevealPrivateKey.tapToRevealPrivateCredentialQRCode();
        await Assertions.expectElementToBeVisible(
          RevealPrivateKey.revealCredentialQRCodeImage,
        );
        await RevealPrivateKey.scrollToDone();
        await RevealPrivateKey.tapDoneButton();
        await Assertions.expectElementToBeVisible(
          SecurityAndPrivacy.securityAndPrivacyHeading,
        );
      },
    );
  });

  it('reveals the correct private key for the first account in the account list ', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedAccountKeyringController()
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapWallet();
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapEditAccountActionsAtIndex(
          IMPORTED_ACCOUNT_0_INDEX,
        );

        await AccountActionsBottomSheet.tapShowPrivateKey();
        await RevealPrivateKey.enterPasswordToRevealSecretCredential(PASSWORD);
        await RevealPrivateKey.tapToReveal();
        await Assertions.expectElementToBeVisible(RevealPrivateKey.container);
        await Assertions.expectTextDisplayed(
          RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_PRIVATE_KEY_TITLE_TEXT,
        );
        await Assertions.expectTextDisplayed(HD_ACCOUNT_1_PRIVATE_KEY);

        // Copy to clipboard
        // Android devices running OS version < 11 (API level 29) will not see the copy to clipboard button presented
        // This will cause the following step to fail if e2e were being run on an older android OS prior to our minimum API level 29
        // See details here: https://github.com/MetaMask/metamask-mobile/pull/4170
        await RevealPrivateKey.tapToCopyCredentialToClipboard();
        await RevealPrivateKey.tapToRevealPrivateCredentialQRCode();
        await Assertions.expectElementToBeVisible(
          RevealPrivateKey.revealCredentialQRCodeImage,
        );
        await RevealPrivateKey.scrollToDone();
        await RevealPrivateKey.tapDoneButton();
        await Assertions.expectElementToBeVisible(WalletView.container);
      },
    );
  });

  it('reveals the correct private key for the second account in the account list which is also an imported account', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedAccountKeyringController()
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapWallet();
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapEditAccountActionsAtIndex(
          IMPORTED_ACCOUNT_1_INDEX,
        );

        await AccountActionsBottomSheet.tapShowPrivateKey();
        await RevealPrivateKey.enterPasswordToRevealSecretCredential(PASSWORD);
        await RevealPrivateKey.tapToReveal();
        await Assertions.expectElementToBeVisible(RevealPrivateKey.container);
        await Assertions.expectTextDisplayed(
          RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_PRIVATE_KEY_TITLE_TEXT,
        );
        await Assertions.expectTextDisplayed(IMPORTED_ACCOUNT_2_PRIVATE_KEY);

        // Copy to clipboard
        // Android devices running OS version < 11 (API level 29) will not see the copy to clipboard button presented
        // This will cause the following step to fail if e2e were being run on an older android OS prior to our minimum API level 29
        // See details here: https://github.com/MetaMask/metamask-mobile/pull/4170
        await RevealPrivateKey.tapToCopyCredentialToClipboard();
        await RevealPrivateKey.tapToRevealPrivateCredentialQRCode();
        await Assertions.expectElementToBeVisible(
          RevealPrivateKey.revealCredentialQRCodeImage,
        );
        await RevealPrivateKey.scrollToDone();
        await RevealPrivateKey.tapDoneButton();
        await Assertions.expectElementToBeVisible(WalletView.container);
      },
    );
  });

  it('does not reveal private key when the password is incorrect', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedAccountKeyringController()
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacy.scrollToRevealPrivateKey();
        await SecurityAndPrivacy.tapShowPrivateKeyButton();
        await RevealPrivateKey.enterPasswordToRevealSecretCredential(
          INCORRECT_PASSWORD,
        );
        await Assertions.expectElementToBeVisible(
          RevealPrivateKey.passwordWarning,
        );
        await Assertions.expectElementToNotBeVisible(
          RevealPrivateKey.revealPrivateKeyButton,
        );
      },
    );
  });
});
