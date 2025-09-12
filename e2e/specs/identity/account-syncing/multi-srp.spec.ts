import { loginToApp } from '../../../viewHelper';
import TestHelpers from '../../../helpers.js';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../framework/Assertions';
import { RegressionIdentity } from '../../../tags.js';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { withIdentityFixtures } from '../utils/withIdentityFixtures.ts';
import { arrangeTestUtils } from '../utils/helpers.ts';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../utils/user-storage/userStorageMockttpController.ts';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import { goToImportSrp, inputSrp } from '../../multisrp/utils.ts';
import ImportSrpView from '../../../pages/importSrp/ImportSrpView';
import { IDENTITY_TEAM_SEED_PHRASE_2 } from '../utils/constants.ts';
import AddNewHdAccountComponent from '../../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import SRPListItemComponent from '../../../pages/wallet/MultiSrp/Common/SRPListItemComponent';
import { createUserStorageController } from '../utils/mocks.ts';

describe(RegressionIdentity('Account syncing - Mutiple SRPs'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    sharedUserStorageController = createUserStorageController();
  });

  const DEFAULT_ACCOUNT_NAME = 'Account 1';
  const SECOND_ACCOUNT_NAME = 'Account 2';
  const SRP_2_FIRST_ACCOUNT = 'Account 3';
  const SRP_2_SECOND_ACCOUNT = 'Number 4';

  /**
   * This test verifies account syncing when adding accounts across multiple SRPs:
   * Phase 1: Starting with the default account, add a second account to the first SRP and verify it syncs.
   * Phase 2: Import a second SRP which automatically creates a third account, then manually create a fourth account on the second SRP with a custom name.
   * Phase 3: Login to a fresh app instance and verify all accounts from both SRPs persist and are visible after importing the second SRP.
   */

  it('should add accounts across multiple SRPs and sync them', async () => {
    await withIdentityFixtures(
      {
        userStorageFeatures: [USER_STORAGE_FEATURE_NAMES.accounts],
        sharedUserStorageController,
      },
      async ({ userStorageMockttpController }) => {
        await loginToApp();

        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            DEFAULT_ACCOUNT_NAME,
          ),
          {
            description: `Account with name "${DEFAULT_ACCOUNT_NAME}" should be visible`,
          },
        );

        const {
          prepareEventsEmittedCounter,
          waitUntilSyncedAccountsNumberEquals,
        } = arrangeTestUtils(userStorageMockttpController);
        const { waitUntilEventsEmittedNumberEquals } =
          prepareEventsEmittedCounter(
            UserStorageMockttpControllerEvents.PUT_SINGLE,
          );

        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateEthereumAccount();
        await waitUntilEventsEmittedNumberEquals(1);

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            SECOND_ACCOUNT_NAME,
          ),
          {
            description: `Account with name "${SECOND_ACCOUNT_NAME}" should be visible`,
          },
        );
        await AccountListBottomSheet.swipeToDismissAccountsModal(); // the next action taps on the identicon again

        // Add SRP 2
        await device.disableSynchronization();
        await goToImportSrp();
        await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);
        await ImportSrpView.tapImportButton();

        await waitUntilSyncedAccountsNumberEquals(3);

        await Assertions.expectElementToBeVisible(WalletView.container);
        const secretPhraseImportedText = 'Secret Recovery Phrase 2 imported';
        // Waiting for toast notification to appear and disappear
        await Assertions.expectTextDisplayed(secretPhraseImportedText);
        await Assertions.expectTextNotDisplayed(secretPhraseImportedText);

        // Create second account for SRP 2
        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
        );

        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateEthereumAccount();
        await AddNewHdAccountComponent.tapSrpSelector();
        await SRPListItemComponent.tapListItemByIndex(1);
        await AddNewHdAccountComponent.enterName(SRP_2_SECOND_ACCOUNT);
        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            SRP_2_SECOND_ACCOUNT,
          ),
          {
            description: `Account with name "${SRP_2_SECOND_ACCOUNT}" should be visible`,
          },
        );
        await device.enableSynchronization();
        await waitUntilEventsEmittedNumberEquals(6);
      },
    );

    await withIdentityFixtures(
      {
        userStorageFeatures: [USER_STORAGE_FEATURE_NAMES.accounts],
        sharedUserStorageController,
      },
      async () => {
        await loginToApp();
        await goToImportSrp();
        await device.disableSynchronization();
        await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);
        await ImportSrpView.tapImportButton();
        await Assertions.expectElementToBeVisible(WalletView.container);
        await WalletView.tapIdenticon();
        await device.enableSynchronization();
        const visibleAccounts = [
          DEFAULT_ACCOUNT_NAME,
          SECOND_ACCOUNT_NAME,
          SRP_2_FIRST_ACCOUNT,
          SRP_2_SECOND_ACCOUNT,
        ];

        for (const accountName of visibleAccounts) {
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(accountName),
            {
              description: `Account with name "${accountName}" should be visible`,
            },
          );
        }
      },
    );
  });
});
