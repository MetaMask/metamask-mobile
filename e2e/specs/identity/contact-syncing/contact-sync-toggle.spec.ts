import { loginToApp } from '../../../viewHelper';
import TestHelpers from '../../../helpers.js';
import Assertions from '../../../../tests/framework/Assertions.ts';
import { SmokeIdentity } from '../../../tags.js';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { withIdentityFixtures } from '../utils/withIdentityFixtures.ts';
import { arrangeTestUtils } from '../utils/helpers.ts';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController.ts';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import SettingsView from '../../../pages/Settings/SettingsView';
import BackupAndSyncView from '../../../pages/Settings/BackupAndSyncView';
import { createUserStorageController } from '../utils/mocks.ts';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView.ts';
import AddContactView from '../../../pages/Settings/Contacts/AddContactView.ts';
import CommonView from '../../../pages/CommonView.ts';

describe(SmokeIdentity('Contacts syncing - Settings'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    sharedUserStorageController = createUserStorageController();
  });

  // Test contact data for contacts syncing test
  const TEST_CONTACT_NAME = 'Test Contact';
  const TEST_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  const NEW_TEST_CONTACT_NAME = 'New Test Contact';
  const NEW_TEST_CONTACT_ADDRESS = '0x0987654321098765432109876543210987654321';

  it('should sync new contacts when contact sync is enabled and exclude contacts created when sync is disabled', async () => {
    await withIdentityFixtures(
      {
        userStorageFeatures: [
          USER_STORAGE_FEATURE_NAMES.addressBook,
          USER_STORAGE_FEATURE_NAMES.accounts,
        ],
        sharedUserStorageController,
      },
      async ({ userStorageMockttpController }) => {
        await loginToApp();

        // First fixture: Create a contact with sync enabled
        await TabBarComponent.tapSettings();
        await Assertions.expectElementToBeVisible(
          SettingsView.contactsSettingsButton,
        );
        await SettingsView.tapContacts();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        await ContactsView.tapAddContactButton();
        await Assertions.expectElementToBeVisible(AddContactView.container);

        const { waitUntilSyncedElementsNumberEquals } = arrangeTestUtils(
          userStorageMockttpController,
        );

        // Add contact details and save
        await AddContactView.typeInName(TEST_CONTACT_NAME);
        await AddContactView.typeInAddress(TEST_CONTACT_ADDRESS);
        await AddContactView.tapAddContactButton();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        await ContactsView.expectContactIsVisible(TEST_CONTACT_NAME);

        // Verify contact was synced to user storage
        await waitUntilSyncedElementsNumberEquals(
          USER_STORAGE_FEATURE_NAMES.addressBook,
          1,
        );
      },
    );

    await withIdentityFixtures(
      {
        userStorageFeatures: [
          USER_STORAGE_FEATURE_NAMES.addressBook,
          USER_STORAGE_FEATURE_NAMES.accounts,
        ],
        sharedUserStorageController,
      },
      async () => {
        await loginToApp();

        // Second fixture: Verify first contact exists and disable sync
        await TabBarComponent.tapSettings();
        await Assertions.expectElementToBeVisible(
          SettingsView.contactsSettingsButton,
        );
        await SettingsView.tapContacts();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        await ContactsView.expectContactIsVisible(TEST_CONTACT_NAME);
        await CommonView.tapBackButton();
        await SettingsView.tapBackButton();

        // Disable contact syncing
        await TabBarComponent.tapSettings();
        await Assertions.expectElementToBeVisible(
          SettingsView.backupAndSyncSectionButton,
        );
        await SettingsView.tapBackupAndSync();

        await Assertions.expectElementToBeVisible(
          BackupAndSyncView.backupAndSyncToggle,
        );
        await Assertions.expectToggleToBeOn(
          BackupAndSyncView.contactSyncToggle,
        );
        await BackupAndSyncView.toggleContactSync();
        await Assertions.expectToggleToBeOff(
          BackupAndSyncView.contactSyncToggle,
        );

        await CommonView.tapBackButton();
        await SettingsView.tapBackButton();

        // Add second contact while sync is disabled
        await TabBarComponent.tapSettings();
        await Assertions.expectElementToBeVisible(
          SettingsView.contactsSettingsButton,
        );
        await SettingsView.tapContacts();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        await ContactsView.tapAddContactButton();
        await Assertions.expectElementToBeVisible(AddContactView.container);
        await AddContactView.typeInName(NEW_TEST_CONTACT_NAME);
        await AddContactView.typeInAddress(NEW_TEST_CONTACT_ADDRESS);
        await AddContactView.tapAddContactButton();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        await ContactsView.expectContactIsVisible(NEW_TEST_CONTACT_NAME);
      },
    );

    await withIdentityFixtures(
      {
        userStorageFeatures: [
          USER_STORAGE_FEATURE_NAMES.addressBook,
          USER_STORAGE_FEATURE_NAMES.accounts,
        ],
        sharedUserStorageController,
      },
      async () => {
        await loginToApp();

        // Third fixture: Verify only synced contact persists after fresh login
        await TabBarComponent.tapSettings();
        await Assertions.expectElementToBeVisible(
          SettingsView.contactsSettingsButton,
        );
        await SettingsView.tapContacts();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        // Contact added with sync enabled should be visible
        await ContactsView.expectContactIsVisible(TEST_CONTACT_NAME);
        // Contact added with sync disabled should not be visible
        await ContactsView.expectContactIsNotVisible(NEW_TEST_CONTACT_NAME);
      },
    );
  });
});
