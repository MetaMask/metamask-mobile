import { SDK } from '@metamask/profile-sync-controller';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
  IDENTITY_TEAM_STORAGE_KEY,
} from '../utils/constants';
import {
  startMockServer,
  stopMockServer,
} from '../../../api-mocking/mock-server';
import {
  accountsToMockForAccountsSync,
  getAccountsSyncMockResponse,
} from './mock-data';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../utils/Assertions';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import AccountActionsBottomSheet from '../../../pages/wallet/AccountActionsBottomSheet';
import {
  mockIdentityServices,
  setupAccountMockedBalances,
} from '../utils/mocks';
import { SmokeIdentity } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';

describe(
  SmokeIdentity(
    'Account syncing - user already has balances on multiple accounts',
  ),
  () => {
    const unencryptedAccounts = accountsToMockForAccountsSync;

    const INITIAL_ACCOUNTS = [
      unencryptedAccounts[0].a,
      unencryptedAccounts[1].a,
      '0xd54ba25a07eb3da821face8478c3d965ded63018',
      '0x2c30c098e2a560988d486c7f25798e790802f953',
    ];

    const ADDITIONAL_ACCOUNTS = [
      '0x6b65DA6735119E72B72fF842Bd92e9DE0C1e4Ae0',
      '0x0f205850eaC507473AA0e47cc8eB528D875E7498',
    ];

    const EXPECTED_ACCOUNT_NAMES = {
      INITIAL: [
        unencryptedAccounts[0].n,
        unencryptedAccounts[1].n,
        'Account 3',
        'Account 4',
      ],
      WITH_NEW_ACCOUNTS: [
        unencryptedAccounts[0].n,
        unencryptedAccounts[1].n,
        'Account 3',
        'Account 4',
        'Account 5',
        'Account 6',
      ],
    };

    let accountsToMockBalances = [...INITIAL_ACCOUNTS];
    let mockServer;

    /**
     * This test verifies the complete account syncing flow in three phases:
     * Phase 1: Initial setup, where we check that 4 accounts are shown due to balance detection even though the user storage only has 2 accounts.
     * Phase 2: Discovery of 2 more accounts after adding balances. We still expect to only see 6 even though we had 5 accounts synced in the previous test
     * Phase 3: Verification that any final changes to user storage are persisted and that we don't see any extra accounts created
     */

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();

      mockServer = await startMockServer();

      const accountsSyncMockResponse = await getAccountsSyncMockResponse();

      const { userStorageMockttpControllerInstance } =
        await mockIdentityServices(mockServer);

      userStorageMockttpControllerInstance.setupPath(
        USER_STORAGE_FEATURE_NAMES.accounts,
        mockServer,
        {
          getResponse: accountsSyncMockResponse,
        },
      );

      await setupAccountMockedBalances(mockServer, accountsToMockBalances);
    });

    afterAll(async () => {
      if (mockServer) {
        await stopMockServer(mockServer);
      }
    });

    it('handles account syncing with balances correctly', async () => {
      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
      });

      // PHASE 1: Initial setup and account creation
      // Complete initial setup with provided seed phrase
      await importWalletWithRecoveryPhrase(
        IDENTITY_TEAM_SEED_PHRASE,
        IDENTITY_TEAM_PASSWORD,
      );

      // Verify initial state and balance
      // Adding a delay here to make sure that importAdditionalAccounts has completed
      await TestHelpers.delay(2000);
      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);

      // Verify each initial account name
      for (const accountName of EXPECTED_ACCOUNT_NAMES.INITIAL) {
        await Assertions.checkIfVisible(
          AccountListBottomSheet.getAccountElementByAccountName(accountName),
        );
      }

      // Create new account and prepare for additional accounts
      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapCreateAccount();
      await TestHelpers.delay(2000);

      accountsToMockBalances = [...INITIAL_ACCOUNTS, ...ADDITIONAL_ACCOUNTS];
      await setupAccountMockedBalances(mockServer, accountsToMockBalances);
      await TestHelpers.delay(2000);

      // PHASE 2: Verify discovery of new accounts with balances
      // Complete setup again for new session
      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
      });

      await importWalletWithRecoveryPhrase(
        IDENTITY_TEAM_SEED_PHRASE,
        IDENTITY_TEAM_PASSWORD,
      );

      // Verify initial state and balance
      // Adding a delay here to make sure that importAdditionalAccounts has completed
      await TestHelpers.delay(2000);
      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(2000);

      // Verify all accounts including newly discovered ones (which would have been synced / have balances)
      for (const accountName of EXPECTED_ACCOUNT_NAMES.WITH_NEW_ACCOUNTS) {
        await Assertions.checkIfVisible(
          AccountListBottomSheet.getAccountElementByAccountName(accountName),
        );
      }

      // Rename Account 6 to verify update to user storage
      await AccountListBottomSheet.tapEditAccountActionsAtIndex(5);
      await AccountActionsBottomSheet.renameActiveAccount(
        'My Renamed Account 6',
      );

      // PHASE 3: Verify name persistence across sessions
      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
      });

      await importWalletWithRecoveryPhrase(
        IDENTITY_TEAM_SEED_PHRASE,
        IDENTITY_TEAM_PASSWORD,
      );

      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(2000);

      await Assertions.checkIfVisible(
        AccountListBottomSheet.getAccountElementByAccountName(
          'My Renamed Account 6',
        ),
      );
    });
  },
);
