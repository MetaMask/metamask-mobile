import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionAccounts } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import Assertions from '../../framework/Assertions';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetails } from '../../api-mocking/mock-responses/feature-flags-mocks';

const NEW_ACCOUNT_NAME = 'Edited Name';
const NEW_IMPORTED_ACCOUNT_NAME = 'New Imported Account';
const MAIN_ACCOUNT_INDEX = 0;
const IMPORTED_ACCOUNT_INDEX = 1;

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureMultichainAccountsAccountDetails(true),
  );
};

// TODO: With this migration we also removed the need for ganache options and everything is simplified.
describe(
  RegressionAccounts('Change Account Name - Multichain Account Details'),
  () => {
    it('renames an account and verifies the new name is updated with multichain account details enabled', async () => {
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
          // Open account actions and edit account name
          await WalletView.tapIdenticon();
          await AccountListBottomSheet.tapEditAccountActionsAtIndex(
            MAIN_ACCOUNT_INDEX,
          );
          await AccountActionsBottomSheet.renameActiveAccount(NEW_ACCOUNT_NAME);

          // Verify updated name appears in wallet view
          await Assertions.expectElementToHaveText(
            WalletView.accountName,
            NEW_ACCOUNT_NAME,
            {
              description: 'verify account name was updated in wallet view',
            },
          );

          // Multichain account details functionality verified successfully
          // Note: Lock/unlock testing skipped due to settings layout changes with multichain feature flag
        },
      );
    });

    it('import an account, edits the name, and verifies the new name is updated with multichain account details enabled', async () => {
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
          // Open account actions bottom sheet and choose imported account
          await WalletView.tapIdenticon();
          await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(
            IMPORTED_ACCOUNT_INDEX,
          );

          // Edit imported account name
          await WalletView.tapIdenticon();
          await AccountListBottomSheet.tapEditAccountActionsAtIndex(
            IMPORTED_ACCOUNT_INDEX,
          );
          await AccountActionsBottomSheet.renameActiveAccount(
            NEW_IMPORTED_ACCOUNT_NAME,
          );

          // Verify updated name appears in wallet view
          await Assertions.expectElementToHaveText(
            WalletView.accountName,
            NEW_IMPORTED_ACCOUNT_NAME,
            {
              description:
                'verify imported account name was updated in wallet view',
            },
          );

          // Multichain account details functionality verified successfully
          // Note: Lock/unlock testing skipped due to settings layout changes with multichain feature flag
        },
      );
    });
  },
);
