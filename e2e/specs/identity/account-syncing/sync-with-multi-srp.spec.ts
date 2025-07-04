import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
  IDENTITY_TEAM_SEED_PHRASE_2,
} from '../utils/constants';
import {
  startMockServer,
  stopMockServer,
} from '../../../api-mocking/mock-server';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../utils/Assertions';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeIdentity } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import AccountActionsBottomSheet from '../../../pages/wallet/AccountActionsBottomSheet';
import { goToImportSrp, inputSrp } from '../../multisrp/utils';
import ImportSrpView from '../../../pages/importSrp/ImportSrpView';
import AddNewHdAccountComponent from '../../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import SRPListItemComponent from '../../../pages/wallet/MultiSrp/Common/SRPListItemComponent';
import { arrangeTestUtils } from '../utils/helpers';
import {
  UserStorageMockttpController,
  UserStorageMockttpControllerEvents,
} from '../utils/user-storage/userStorageMockttpController';
import { MockttpServer } from 'mockttp';

describe(
  SmokeIdentity('Account syncing - syncs after adding a second SRP'),
  () => {
    let mockServer: MockttpServer;
    let userStorageMockttpController: UserStorageMockttpController;

    const defaultAccountOneName = 'Account 1';
    const secondAccountName = 'My Second Account';
    const defaultAccountOneNameSrp2 = 'Account 3';
    const thirdAccountNameSrp2 = 'My Fourth Account';

    const expectedAccountNames = [
      defaultAccountOneName,
      secondAccountName,
      defaultAccountOneNameSrp2,
      thirdAccountNameSrp2,
    ];

    beforeAll(async () => {
      jest.setTimeout(2500000);
      mockServer = await startMockServer({});

      const { userStorageMockttpControllerInstance } =
        await mockIdentityServices(mockServer);

      userStorageMockttpController = userStorageMockttpControllerInstance;

      await userStorageMockttpController.setupPath(
        USER_STORAGE_FEATURE_NAMES.accounts,
        mockServer,
      );

      await TestHelpers.reverseServerPort();

      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
        launchArgs: {
          mockServerPort: mockServer.port,
        },
      });
    });

    afterAll(async () => {
      if (mockServer) {
        await stopMockServer(mockServer);
      }
    });

    it('syncs multi-SRP EVM accounts', async () => {
      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });

      // Create second account for SRP 1
      const {
        waitUntilSyncedAccountsNumberEquals,
        prepareEventsEmittedCounter,
      } = arrangeTestUtils(userStorageMockttpController);

      const { waitUntilEventsEmittedNumberEquals } =
        prepareEventsEmittedCounter(
          UserStorageMockttpControllerEvents.PUT_SINGLE,
        );

      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);

      await waitUntilSyncedAccountsNumberEquals(1);

      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapCreateAccount();

      await AccountListBottomSheet.tapEditAccountActionsAtIndex(1);
      await AccountActionsBottomSheet.renameActiveAccount(secondAccountName);

      await Assertions.checkIfElementToHaveText(
        WalletView.accountName,
        secondAccountName,
      );

      // Wait for the account AND account name to be synced
      await waitUntilSyncedAccountsNumberEquals(2);
      await waitUntilEventsEmittedNumberEquals(1);

      // Add SRP 2
      await goToImportSrp();
      await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);
      await ImportSrpView.tapImportButton();

      await waitUntilSyncedAccountsNumberEquals(3);

      await Assertions.checkIfVisible(WalletView.container);

      // Create second account for SRP 2
      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);

      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapCreateAccount();
      await AddNewHdAccountComponent.tapSrpSelector();
      await SRPListItemComponent.tapListItemByIndex(1);
      await AddNewHdAccountComponent.enterName(thirdAccountNameSrp2);

      // Wait for the account AND account name to be synced
      await waitUntilSyncedAccountsNumberEquals(4);
      await waitUntilEventsEmittedNumberEquals(3);

      // Relaunch app
      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
        launchArgs: {
          mockServerPort: mockServer.port,
        },
      });

      // Onboard with SRP 1 and import SRP 2
      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });
      await goToImportSrp();
      await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);
      await ImportSrpView.tapImportButton();

      await Assertions.checkIfVisible(WalletView.container);

      // Check if accounts are synced
      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(4000);

      for (const accountName of expectedAccountNames) {
        await Assertions.webViewElementExists(
          AccountListBottomSheet.getAccountElementByAccountName(accountName),
        );
      }
    });
  },
);
