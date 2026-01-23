import { RegressionAccounts } from '../../tags.js';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../../tests/framework/Assertions';
import PrivateKeysList from '../../pages/MultichainAccounts/PrivateKeyList';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import { Mockttp } from 'mockttp';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';

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
