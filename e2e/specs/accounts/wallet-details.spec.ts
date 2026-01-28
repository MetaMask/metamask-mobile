import { SmokeAccounts } from '../../tags';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../tests/framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import WalletDetails from '../../pages/MultichainAccounts/WalletDetails';
import { completeSrpQuiz } from '../multisrp/utils';
import { defaultGanacheOptions } from '../../../tests/framework/Constants';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';

describe(SmokeAccounts('Wallet details'), () => {
  const FIRST = 0;

  it('goes to the wallet details, creates an account and exports srp', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        remoteFeatureMultichainAccountsAccountDetailsV2(), // TODO: remove it after account details v2 will be enabled by default
      );
    };

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountOneQrAccountOneSimpleKeyPairAccount()
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await device.disableSynchronization();
        await loginToApp();
        await WalletView.tapIdenticon();

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          {
            description: 'Account list should be visible',
          },
        );
        await AccountListBottomSheet.tapAccountEllipsisButtonV2(FIRST);
        await AccountDetails.tapEditWalletName();
        await Assertions.expectTextDisplayed('Wallet 1', {
          description: `Wallet 1 should be visible`,
        });

        await WalletDetails.tapCreateAccount();
        const visibleAccounts = ['Account 1', 'Account 2', 'Account 3'];
        for (const accountName of visibleAccounts) {
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              accountName,
            ),
            {
              description: `Account ${accountName} should be visible`,
            },
          );
        }

        await WalletDetails.tapSRP();
        await completeSrpQuiz(defaultGanacheOptions.mnemonic);

        await WalletView.tapIdenticon();
        for (const accountName of visibleAccounts) {
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              accountName,
            ),
            {
              description: `Account ${accountName} should be visible`,
            },
          );
        }
      },
    );
  });
});
