import { RegressionAccounts } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../page-objects/viewHelper.ts';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import Assertions from '../../framework/Assertions';
import PrivateKeysList from '../../page-objects/MultichainAccounts/PrivateKeyList';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails';
import { Mockttp } from 'mockttp';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

describe(RegressionAccounts('Account details private key'), () => {
  const PASSWORD = '123123123';
  const INCORRECT_PASSWORD = 'wrongpassword';
  const IMPORTED_ACCOUNT_INDEX = 1;
  const MAINNET_INDEX = 0;
  const VISIBILE_NETWORK = ['Ethereum Main Network', 'Linea Main Network'];

  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      remoteFeatureMultichainAccountsAccountDetailsV2(true),
    );
  };

  it('it should copy to clipboard the correct private key for the first account in the account list ', async () => {
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
        await AccountListBottomSheet.tapAccountEllipsisButtonV2(
          IMPORTED_ACCOUNT_INDEX,
        );
        await AccountDetails.tapPrivateKeyLink();

        await PrivateKeysList.typePassword(PASSWORD);
        await PrivateKeysList.tapContinue();

        for (const networkName of VISIBILE_NETWORK) {
          await Assertions.expectTextDisplayed(networkName, {
            description: `Network ${networkName} should be visible`,
          });
        }

        await device.disableSynchronization();
        await PrivateKeysList.tapCopyToClipboardAtIndex(MAINNET_INDEX);
        await Assertions.expectElementToBeVisible(
          PrivateKeysList.privateKeyCopiedLabel,
          {
            description: "'Private key copied' message should be visible",
          },
        );
        await device.enableSynchronization();
      },
    );
  });

  it('it should not reveal private key when the password is incorrect', async () => {
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
        await AccountListBottomSheet.tapAccountEllipsisButtonV2(
          IMPORTED_ACCOUNT_INDEX,
        );
        await AccountDetails.tapPrivateKeyLink();
        await PrivateKeysList.typePassword(INCORRECT_PASSWORD);
        await PrivateKeysList.tapContinue();
        await Assertions.expectElementToBeVisible(
          PrivateKeysList.wrongPasswordLabel,
          {
            description: "'Wrong password' message should be visible",
          },
        );
      },
    );
  });
});
