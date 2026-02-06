import { SmokeWalletPlatform } from '../../tags';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../../tests/framework/Assertions';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import SRPListItemComponent from '../../pages/wallet/MultiSrp/Common/SRPListItemComponent';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';

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

describe(
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
