import { Mockttp } from 'mockttp';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
} from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import { setupMockRequest } from '../../api-mocking/mockHelpers';

export interface Account {
  name: string;
  index: number;
  address: string;
}

export const HD_ACCOUNT: Account = {
  name: 'Account 1',
  index: 0,
  address: DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
};

export const SIMPLE_KEYPAIR_ACCOUNT: Account = {
  name: 'Account 4',
  index: 4,
  address: DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
};

export const goToAccountDetails = async (account: Account) => {
  await AccountListBottomSheet.tapEditAccountActionsAtIndex(account.index);
};

export const withMultichainAccountDetailsEnabled = async (
  testFn: () => Promise<void>,
) => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    const { urlEndpoint, response } =
      mockEvents.GET.remoteFeatureMultichainAccountsAccountDetails();
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: urlEndpoint,
      response,
      responseCode: 200,
    });
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
