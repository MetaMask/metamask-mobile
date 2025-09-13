import { Mockttp } from 'mockttp';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
} from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import {
  remoteFeatureMultichainAccountsAccountDetails,
  remoteFeatureMultichainAccountsAccountDetailsV2,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

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
    await setupRemoteFeatureFlagsMock(
      mockServer,
      remoteFeatureMultichainAccountsAccountDetails(),
    );
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

export const withMultichainAccountDetailsV2Enabled = async (
  testFn: () => Promise<void>,
) => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      remoteFeatureMultichainAccountsAccountDetailsV2(),
    );
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
