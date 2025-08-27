import { loginToApp } from '../../viewHelper';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import Assertions from '../../framework/Assertions';
import { SmokeAccounts } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { setupMockRequest } from '../../api-mocking/mockHelpers';
import { Mockttp } from 'mockttp';

describe(SmokeAccounts('Account Rename UI Flows'), () => {
  const ORIGINAL_ACCOUNT_NAME = 'Account 1';
  const NEW_ACCOUNT_NAME = 'Renamed Test Account';

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  /**
   * Test that verifies the legacy account rename flow works correctly
   * when the multichain accounts feature flag is disabled.
   */
  it('should rename account using legacy UI flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const { urlEndpoint, response } =
            mockEvents.GET.remoteFeatureMultichainAccountsAccountDetails(false);
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: urlEndpoint,
            response,
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapIdenticon();

        // Verify original account name is visible
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            ORIGINAL_ACCOUNT_NAME,
          ),
          {
            description: `Original account "${ORIGINAL_ACCOUNT_NAME}" should be visible`,
          },
        );

        await AccountListBottomSheet.tapEditAccountActionsAtIndex(0);
        await AccountActionsBottomSheet.renameActiveAccountLegacy(
          NEW_ACCOUNT_NAME,
        );

        await WalletView.tapIdenticon();

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            NEW_ACCOUNT_NAME,
          ),
          {
            description: `Renamed account "${NEW_ACCOUNT_NAME}" should be visible`,
          },
        );

        await Assertions.expectElementToNotBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            ORIGINAL_ACCOUNT_NAME,
          ),
          {
            description: `Original account name "${ORIGINAL_ACCOUNT_NAME}" should not be visible`,
          },
        );
      },
    );
  });

  /**
   * Test that verifies the modern multichain account rename flow works correctly
   * when the multichain accounts feature flag is enabled.
   */
  it('should rename account using modern multichain UI flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const { urlEndpoint, response } =
            mockEvents.GET.remoteFeatureMultichainAccountsAccountDetails(true);
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: urlEndpoint,
            response,
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapIdenticon();

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            ORIGINAL_ACCOUNT_NAME,
          ),
          {
            description: `Original account "${ORIGINAL_ACCOUNT_NAME}" should be visible`,
          },
        );

        await AccountListBottomSheet.tapEditAccountActionsAtIndex(0);
        await AccountActionsBottomSheet.renameActiveAccountMultichain(
          NEW_ACCOUNT_NAME,
        );

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            NEW_ACCOUNT_NAME,
          ),
          {
            description: `Renamed account "${NEW_ACCOUNT_NAME}" should be visible`,
          },
        );

        await Assertions.expectElementToNotBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            ORIGINAL_ACCOUNT_NAME,
          ),
          {
            description: `Original account name "${ORIGINAL_ACCOUNT_NAME}" should not be visible`,
          },
        );
      },
    );
  });
});
