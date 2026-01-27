import { RegressionAccounts } from '../../../e2e/tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';
import Assertions from '../../framework/Assertions.ts';
import PrivateKeysList from '../../../e2e/pages/MultichainAccounts/PrivateKeyList.ts';
import WalletView from '../../../e2e/pages/wallet/WalletView.ts';
import AccountListBottomSheet from '../../../e2e/pages/wallet/AccountListBottomSheet.ts';
import AccountDetails from '../../../e2e/pages/MultichainAccounts/AccountDetails.ts';

describe(RegressionAccounts('Account details private key'), () => {
  const PASSWORD = '123123123';
  const INCORRECT_PASSWORD = 'wrongpassword';
  const IMPORTED_ACCOUNT_INDEX = 1;
  const MAINNET_INDEX = 0;
  const VISIBILE_NETWORK = ['Ethereum Main Network', 'Linea Main Network'];

  it('it should copy to clipboard the correct private key for the first account in the account list ', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedAccountKeyringController()
          .build(),
        restartDevice: true,
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
