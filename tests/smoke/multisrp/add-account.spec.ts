import { SmokeWalletPlatform } from '../../../e2e/tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import WalletView from '../../../e2e/pages/wallet/WalletView.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import Assertions from '../../framework/Assertions.ts';
import AccountListBottomSheet from '../../../e2e/pages/wallet/AccountListBottomSheet.ts';
import AddAccountBottomSheet from '../../../e2e/pages/wallet/AddAccountBottomSheet.ts';
import SRPListItemComponent from '../../../e2e/pages/wallet/MultiSrp/Common/SRPListItemComponent.ts';
import AddNewHdAccountComponent from '../../../e2e/pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent.ts';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.ts';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../api-mocking/mock-responses/feature-flags-mocks.ts';

const SRP_1 = {
  index: 1,
  id: '01JX9NJ15HPNS6RRRYBCKDK33R',
};

const SRP_2 = {
  index: 2,
  id: '01JX9NZWRAVQKES02TWSN8GD91',
};

const addAccountToSrp = async (
  srp: { index: number; id: string },
  accountName: string,
) => {
  await AccountListBottomSheet.tapAddAccountButton();
  await AddAccountBottomSheet.tapCreateEthereumAccount();
  await Assertions.expectElementToBeVisible(AddNewHdAccountComponent.container);

  // convert srpNumber to index
  const srpIndex = srp.index - 1;

  if (srpIndex < 0) {
    throw new Error('Invalid SRP number');
  }

  // Need to select the srp if its not the default srp
  if (srpIndex > 0) {
    // Need to tap the first srp to open the list
    await AddNewHdAccountComponent.tapSrpSelector();
    await SRPListItemComponent.tapListItem(srp.id);
  }

  // After entering the name the return key is
  // entered to submit the name and account creation
  if (accountName) {
    await AddNewHdAccountComponent.enterName(accountName);
  } else {
    await AddNewHdAccountComponent.tapConfirm();
  }
  await WalletView.tapIdenticon();
  await Assertions.expectElementToBeVisible(AccountListBottomSheet.accountList);
};

describe.skip(
  SmokeWalletPlatform('Multi-SRP: Add new account to a specific SRP'),
  () => {
    it('adds an account to default SRP and one to the imported SRP', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeatureMultichainAccountsAccountDetailsV2(false),
            );
          },
        },
        async () => {
          await loginToApp();
          await WalletView.tapIdenticon();
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.accountList,
          );
          await addAccountToSrp(SRP_1, 'Account 4');
          await addAccountToSrp(SRP_2, 'Account 5');
        },
      );
    });
  },
);
