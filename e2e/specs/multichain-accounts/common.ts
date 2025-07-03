import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';

export interface Account {
  name: string;
  index: number;
  address: string;
}

export const HD_ACCOUNT: Account = {
  name: 'Account 1',
  index: 0,
  address: DEFAULT_FIXTURE_ACCOUNT,
};

export const SIMPLE_KEYPAIR_ACCOUNT: Account = {
  name: 'Account 4',
  index: 4,
  address: DEFAULT_FIXTURE_ACCOUNT,
};

export const goToAccountDetails = async (account: Account) => {
  // With the new multichain account design, the account list can only show a maximum of
  // 4 accounts and sometimes only partially 5 accounts. If the test is trying to select the 4th account or higher,
  // the matcher would sometimes return a null value thus causing the test to fail.
  let indexToUse = account.index;
  indexToUse = Math.min(account.index, 3);

  await AccountListBottomSheet.tapEditAccountActionsAtIndex(indexToUse);
};

export const withMultichainAccountDetailsEnabled = async (
  testFn: () => Promise<void>,
) => {
  const testSpecificMock = {
    GET: [mockEvents.GET.remoteFeatureMultichainAccountsAccountDetails],
  };
  return await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountOneQrAccountOneSimpleKeyPairAccount()
        .build(),
      restartDevice: true,
      testSpecificMock,
    },
    async () => {
      await loginToApp();
      await WalletView.tapIdenticon();
      await testFn();
    },
  );
};
