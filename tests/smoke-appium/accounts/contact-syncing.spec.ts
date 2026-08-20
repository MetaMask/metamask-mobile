import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import {
  addContact,
  disableContactSyncViaSettings,
  loginAndOpenContacts,
} from '../../flows/accounts.flow.js';
import { withIdentityFixtures } from '../../smoke/identity/utils/withIdentityFixtures.js';
import { arrangeTestUtils } from '../../smoke/identity/utils/helpers.js';
import { UserStorageMockttpController } from '../../smoke/identity/utils/user-storage/userStorageMockttpController.js';
import { createUserStorageController } from '../../smoke/identity/utils/mocks.js';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import ContactsView from '../../page-objects/Settings/Contacts/ContactsView.js';
import AccountMenu from '../../page-objects/AccountMenu/AccountMenu.js';
import CommonView from '../../page-objects/CommonView.js';
import Assertions from '../../framework/Assertions.js';
import { contactFixtureOptions } from './identity-fixture-options.js';

appiumTest.describe(SmokeAccounts('Contact syncing'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  appiumTest.beforeAll(() => {
    sharedUserStorageController = createUserStorageController();
  });

  const SYNCED_CONTACT_NAME = 'Test Contact';
  const SYNCED_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  const LOCAL_ONLY_CONTACT_NAME = 'New Test Contact';
  const LOCAL_ONLY_CONTACT_ADDRESS =
    '0x0987654321098765432109876543210987654321';

  appiumTest(
    'syncs contacts to user storage, restores after restart, and excludes contacts created when sync is disabled',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const fixtureOptions = contactFixtureOptions(
        sharedUserStorageController,
        currentDeviceDetails,
      );

      // Phase 1: With contact sync enabled, add a contact and verify it is written
      // to user storage (addressBook).
      await withIdentityFixtures(
        fixtureOptions,
        async ({ userStorageMockttpController }) => {
          const { waitUntilSyncedElementsNumberEquals } = arrangeTestUtils(
            userStorageMockttpController,
          );

          await loginAndOpenContacts({ scenarioType: 'e2e' });
          await addContact(SYNCED_CONTACT_NAME, SYNCED_CONTACT_ADDRESS);

          await waitUntilSyncedElementsNumberEquals(
            USER_STORAGE_FEATURE_NAMES.addressBook,
            1,
          );
        },
      );

      // Phase 2: Verify the synced contact persists, disable contact sync, then add
      // a second contact locally — it should not be synced to user storage.
      await withIdentityFixtures(fixtureOptions, async () => {
        await loginAndOpenContacts({ scenarioType: 'e2e' });
        await ContactsView.expectContactIsVisible(SYNCED_CONTACT_NAME);
        await CommonView.tapBackButton();
        await AccountMenu.tapBack();

        await disableContactSyncViaSettings();
        await AccountMenu.tapContacts();
        await Assertions.expectElementToBeVisible(ContactsView.container, {
          description: 'Contacts view should be visible after disabling sync',
        });
        await addContact(LOCAL_ONLY_CONTACT_NAME, LOCAL_ONLY_CONTACT_ADDRESS);
      });

      // Phase 3: Restart with shared user-storage state. The synced contact should
      // be restored; the locally added contact must be absent.
      await withIdentityFixtures(fixtureOptions, async () => {
        await loginAndOpenContacts({ scenarioType: 'e2e' });
        await ContactsView.expectContactIsVisible(SYNCED_CONTACT_NAME);
        await ContactsView.expectContactIsNotVisible(LOCAL_ONLY_CONTACT_NAME);
      });
    },
  );
});
