import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../utils/constants';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import { SmokeIdentity } from '../../../tags';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../../pages/Settings/Contacts/AddContactView';
import SettingsView from '../../../pages/Settings/SettingsView';
import Assertions from '../../../framework/Assertions';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { arrangeTestUtils } from '../utils/helpers';
import { withIdentityFixtures } from '../utils/withIdentityFixtures';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController';
import { createUserStorageController } from '../utils/mocks';

describe(SmokeIdentity('Contact syncing - syncs new contacts'), () => {
  const NEW_CONTACT_NAME = 'New Test Contact';
  const NEW_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  let sharedUserStorageController: UserStorageMockttpController;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    sharedUserStorageController = createUserStorageController();
  });

  it('syncs users contacts and retrieves them after importing the same SRP', async () => {
    await withIdentityFixtures(
      {
        userStorageFeatures: [
          USER_STORAGE_FEATURE_NAMES.addressBook,
          USER_STORAGE_FEATURE_NAMES.accounts,
        ],
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        sharedUserStorageController,
      },
      async ({ userStorageMockttpController }) => {
        await importWalletWithRecoveryPhrase({
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
        });

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

        await AddContactView.typeInName(NEW_CONTACT_NAME);
        await AddContactView.typeInAddress(NEW_CONTACT_ADDRESS);
        await AddContactView.tapAddContactButton();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        await ContactsView.expectContactIsVisible(NEW_CONTACT_NAME);

        // Verify contact was synced
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
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        sharedUserStorageController,
      },
      async () => {
        await importWalletWithRecoveryPhrase({
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
        });

        await TabBarComponent.tapSettings();
        await Assertions.expectElementToBeVisible(
          SettingsView.contactsSettingsButton,
        );
        await SettingsView.tapContacts();
        await Assertions.expectElementToBeVisible(ContactsView.container);

        await ContactsView.expectContactIsVisible(NEW_CONTACT_NAME);
      },
    );
  });
});
