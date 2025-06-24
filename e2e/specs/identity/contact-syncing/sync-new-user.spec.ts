/* eslint-disable no-console */
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../utils/constants';
import { startMockServer, stopMockServer } from '../../../api-mocking/mock-server';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeWalletPlatform } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController';
import { MockttpServer } from 'mockttp';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../../pages/Settings/Contacts/AddContactView';
import SettingsView from '../../../pages/Settings/SettingsView';
import Assertions from '../../../utils/Assertions';

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

  // Helper function to navigate to contacts with better error handling
  async function navigateToContacts() {
    // Wait for app to be fully loaded
    await TestHelpers.delay(5000);

    // Navigate to settings
    await TabBarComponent.tapSettings();
    await TestHelpers.delay(3000);

    // Wait for settings to load and tap contacts
    await SettingsView.tapContacts();
    await TestHelpers.delay(3000);
  }

  it('syncs new contacts and retrieves them after importing the same SRP', async () => {
    try {
      console.log('=== Starting contact syncing test ===');

      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });
      console.log('✅ Wallet imported successfully');

      // Navigate to contacts
      console.log('🔄 Navigating to contacts...');
      await navigateToContacts();
      console.log('✅ Successfully navigated to contacts');

      // Add new contact
      console.log('🔄 Adding new contact...');
      await ContactsView.tapAddContactButton();
      await TestHelpers.delay(2000);
      console.log('✅ Add contact button tapped');

      console.log(`🔄 Typing contact name: ${NEW_CONTACT_NAME}`);
      await AddContactView.typeInName(NEW_CONTACT_NAME);
      console.log('✅ Contact name typed');

      console.log(`🔄 Typing contact address: ${NEW_CONTACT_ADDRESS}`);
      await AddContactView.typeInAddress(NEW_CONTACT_ADDRESS);
      console.log('✅ Contact address typed');

      console.log('🔄 Tapping add contact button...');
      await AddContactView.tapAddContactButton();
      console.log('✅ Add contact button tapped');

      // Wait for contact to be added and sync
      console.log('⏳ Waiting for contact to be added and sync...');
      await TestHelpers.delay(5000);
      console.log('✅ Initial wait completed');

      // Add additional wait for the contacts list to refresh
      console.log('⏳ Waiting for contacts list to refresh...');
      await TestHelpers.delay(2000);
      console.log('✅ Additional wait completed');

      // Wait for the contact to be visible with proper assertion and longer timeout
      console.log(`🔍 Checking if contact "${NEW_CONTACT_NAME}" is visible...`);
      try {
        await Assertions.checkIfTextIsDisplayed(NEW_CONTACT_NAME, 15000);
        console.log('✅ Contact is visible locally');

        // Check if the contact was actually synced to the mock server
        console.log('🔍 Checking mock server state...');
        try {
          const addressBookPath = userStorageMockttpController.paths.get(USER_STORAGE_FEATURE_NAMES.addressBook);
          console.log('📊 Address book path state:', JSON.stringify(addressBookPath, null, 2));
          console.log('📊 All paths state:', JSON.stringify(Array.from(userStorageMockttpController.paths.entries()), null, 2));
        } catch (mockError) {
          console.error('❌ Could not get mock server state:', mockError);
        }
      } catch (error) {
        console.error('❌ Failed to find contact locally:', error);
        console.log('🔍 Attempting to check if any contacts are visible...');

        // Try to get more debug info about what's actually visible
        try {
          // This might help us see what's actually on the screen
          console.log('🔍 Checking if contacts page is still loaded...');
          await ContactsView.container;
          console.log('✅ Contacts page is still loaded');
        } catch (containerError) {
          console.error('❌ Contacts page is not loaded:', containerError);
        }

        throw error;
      }

      // Restart app to test sync
      console.log('🔄 Restarting app to test sync...');
      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
        launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
      });
      console.log('✅ App restarted successfully');

      console.log('🔄 Importing wallet on second device...');
      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });
      console.log('✅ Wallet imported on second device');

      // Navigate to contacts on second device
      console.log('🔄 Navigating to contacts on second device...');
      await navigateToContacts();
      console.log('✅ Successfully navigated to contacts on second device');

      // Wait longer for sync to complete
      console.log('⏳ Waiting for sync to complete...');
      await TestHelpers.delay(8000);
      console.log('✅ Sync wait completed');

      // Add additional wait for the contacts list to refresh
      console.log('⏳ Waiting for contacts list to refresh on second device...');
      await TestHelpers.delay(2000);
      console.log('✅ Additional wait completed on second device');

      // Verify contact synced from remote with proper assertion and longer timeout
      console.log(`🔍 Checking if contact "${NEW_CONTACT_NAME}" synced from remote...`);
      try {
        await Assertions.checkIfTextIsDisplayed(NEW_CONTACT_NAME, 15000);
        console.log('✅ Contact synced successfully from remote');
      } catch (error) {
        console.error('❌ Failed to find synced contact:', error);
        console.log('🔍 Attempting to check if any contacts are visible on second device...');

        // Try to get more debug info about what's actually visible
        try {
          console.log('🔍 Checking if contacts page is still loaded on second device...');
          await ContactsView.container;
          console.log('✅ Contacts page is still loaded on second device');
        } catch (containerError) {
          console.error('❌ Contacts page is not loaded on second device:', containerError);
        }

        throw error;
      }

      console.log('🎉 Contact syncing test completed successfully!');
    } catch (error) {
      console.error('💥 Test failed with error:', error);
      console.error('💥 Error stack:', (error as Error).stack);
      console.error('💥 Error message:', (error as Error).message);

      // Try to get more context about the current state
      try {
        console.log('🔍 Attempting to get current app state for debugging...');
        // You might want to add some state checking here if available
      } catch (stateError) {
        console.error('❌ Could not get app state:', stateError);
      }

      throw error;
    }
  });
});
