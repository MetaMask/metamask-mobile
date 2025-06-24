import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../utils/constants';
import { startMockServer, stopMockServer } from '../../../api-mocking/mock-server';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import Assertions from '../../../utils/Assertions';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeWalletPlatform } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController';
import { MockttpServer } from 'mockttp';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../../pages/Settings/Contacts/AddContactView';
import SettingsView from '../../../pages/Settings/SettingsView';

describe(SmokeWalletPlatform('Contact syncing - syncs new contacts'), () => {
  const NEW_CONTACT_NAME = 'New Test Contact';
  const NEW_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  const TEST_SPECIFIC_MOCK_SERVER_PORT = 8006;
  let mockServer: MockttpServer;
  let userStorageMockttpController: UserStorageMockttpController;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();

    mockServer = await startMockServer({}, TEST_SPECIFIC_MOCK_SERVER_PORT);

    const { userStorageMockttpControllerInstance } = await mockIdentityServices(
      mockServer,
    );

    userStorageMockttpController = userStorageMockttpControllerInstance;

    await userStorageMockttpController.setupPath(
      USER_STORAGE_FEATURE_NAMES.addressBook,
      mockServer,
      {
        getResponse: [], // Start with empty contacts for new user
      },
    );

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
    });
  });

  afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer);
    }
  });

  // Helper function to navigate to contacts with retry logic
  async function navigateToContactsWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await TabBarComponent.tapSettings();
        await TestHelpers.delay(3000);
        
        // Verify we're in settings first
        await Assertions.checkIfVisible(SettingsView.generalSettingsButton);
        
        await SettingsView.tapContacts();
        await TestHelpers.delay(2000);
        
        // Try to find the contacts screen
        await Assertions.checkIfVisible(ContactsView.container);
        return; // Success, exit the retry loop
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Attempt ${attempt} failed to navigate to contacts: ${errorMessage}`);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to navigate to contacts after ${maxRetries} attempts. Last error: ${errorMessage}`);
        }
        
        // Wait before retrying
        await TestHelpers.delay(2000);
      }
    }
  }

  it('syncs new contacts and retrieves them after importing the same SRP', async () => {
    await importWalletWithRecoveryPhrase({
      seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
      password: IDENTITY_TEAM_PASSWORD,
    });

    await navigateToContactsWithRetry();
    await ContactsView.tapAddContactButton();
    await Assertions.checkIfVisible(AddContactView.container);

    await AddContactView.typeInName(NEW_CONTACT_NAME);
    await AddContactView.typeInAddress(NEW_CONTACT_ADDRESS);
    await AddContactView.tapAddContactButton();
    await Assertions.checkIfVisible(ContactsView.container);
    await TestHelpers.delay(4000);
    await ContactsView.isContactAliasVisible(NEW_CONTACT_NAME);

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
    });

    await importWalletWithRecoveryPhrase({
      seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
      password: IDENTITY_TEAM_PASSWORD,
    });

    // Navigate to contacts with retry logic for the second time
    await navigateToContactsWithRetry();
    
    // Wait longer for sync to complete on the second device
    await TestHelpers.delay(6000);

    await ContactsView.isContactAliasVisible(NEW_CONTACT_NAME);
  });
});
