import { SmokeAccounts } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetails } from '../../api-mocking/mock-responses/feature-flags-mocks';

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureMultichainAccountsAccountDetails(true),
  );
};

describe(SmokeAccounts('Create wallet accounts'), () => {
  it('should be able to add new accounts - EVM and Solana', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withKeyringController().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          {
            description: 'Account list should be visible',
          },
        );
        await AccountListBottomSheet.tapCreateEthereumAccount();

        // This needs to be replaced
        // await AccountListBottomSheet.tapAddAccountButton();
        // await AddAccountBottomSheet.tapAddSolanaAccount();
        // await AddNewHdAccountComponent.tapConfirm();
        // await NetworkEducationModal.tapGotItButton();
        // await WalletView.tapIdenticon();

        const visibleAccounts = ['Account 1', 'Account 2'];
        for (const accountName of visibleAccounts) {
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(accountName),
            {
              description: `Account with name "${accountName}" should be visible`,
            },
          );
        }

        await AccountListBottomSheet.tapAccountByName(visibleAccounts[1]);
        await Assertions.expectElementToHaveText(
          WalletView.accountName,
          visibleAccounts[1],
        );
      },
    );
  });
});
