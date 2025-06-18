import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../utils/constants';
import {
  startMockServer,
  stopMockServer,
} from '../../../api-mocking/mock-server';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import Assertions from '../../../utils/Assertions';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeWalletPlatform } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { arrangeTestUtils } from './helpers';
import {
  UserStorageMockttpController,
  UserStorageMockttpControllerEvents,
} from '../utils/user-storage/userStorageMockttpController';
import { MockttpServer } from 'mockttp';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView';

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

  it('syncs new contacts and retrieves them after importing the same SRP', async () => {
    await importWalletWithRecoveryPhrase({
      seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
      password: IDENTITY_TEAM_PASSWORD,
    });

    await TabBarComponent.tapContacts();
    await Assertions.checkIfVisible(
      ContactsView.container,
      'Contacts view should be visible',
    );
    await TestHelpers.delay(4000);

    const { prepareEventsEmittedCounter, waitUntilSyncedContactsNumberEquals } =
      arrangeTestUtils(userStorageMockttpController);
    const { waitUntilEventsEmittedNumberEquals } = prepareEventsEmittedCounter(
      UserStorageMockttpControllerEvents.PUT_SINGLE,
    );

    await ContactsView.tapAddContactButton();
    await Assertions.checkIfVisible(
      AddContactView.container,
      'Add contact view should be visible',
    );
    await AddContactView.typeContactName(NEW_CONTACT_NAME);
    await AddContactView.typeContactAddress(NEW_CONTACT_ADDRESS);
    await AddContactView.tapSaveButton();
    await TestHelpers.delay(2000);

    await waitUntilEventsEmittedNumberEquals(1);
    await waitUntilSyncedContactsNumberEquals(1);

    await Assertions.checkIfVisible(
      ContactsView.getContactElementByContactName(NEW_CONTACT_NAME),
      `Contact "${NEW_CONTACT_NAME}" should be visible in the list`,
    );

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
    });

    await importWalletWithRecoveryPhrase({
      seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
      password: IDENTITY_TEAM_PASSWORD,
    });

    await TabBarComponent.tapContacts();
    await Assertions.checkIfVisible(
      ContactsView.container,
      'Contacts view should be visible',
    );
    await TestHelpers.delay(4000);

    await Assertions.checkIfVisible(
      ContactsView.getContactElementByContactName(NEW_CONTACT_NAME),
      `Contact "${NEW_CONTACT_NAME}" should be visible in the list after app restart`,
    );
  });
});
