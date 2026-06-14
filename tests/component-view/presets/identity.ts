import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import { createStateFixture } from '../stateFixture';

const IDENTITY_ACCOUNT_ADDRESS = '0x0000000000000000000000000000000000000001';

export const SYNCED_CONTACT = {
  name: 'Test Contact',
  address: '0x1234567890123456789012345678901234567890',
  chainId: '0x1' as const,
};

export const LOCAL_ONLY_CONTACT = {
  name: 'New Test Contact',
  address: '0x0987654321098765432109876543210987654321',
  chainId: '0x1' as const,
};

interface AddressBookEntry {
  name: string;
  address: string;
  chainId: `0x${string}`;
  memo?: string;
}

type AddressBookState = Record<`0x${string}`, Record<string, AddressBookEntry>>;

interface InitialStateIdentityOptions {
  isBackupAndSyncEnabled?: boolean;
  isAccountSyncingEnabled?: boolean;
  isContactSyncingEnabled?: boolean;
  addressBook?: AddressBookState;
}

export const syncedContactAddressBook: AddressBookState = {
  '0x1': {
    [SYNCED_CONTACT.address]: SYNCED_CONTACT,
  },
};

export const initialStateIdentity = (
  options: InitialStateIdentityOptions = {},
) => {
  const {
    isBackupAndSyncEnabled = true,
    isAccountSyncingEnabled = true,
    isContactSyncingEnabled = true,
    addressBook = {},
  } = options;

  return createStateFixture()
    .withMinimalAccounts(IDENTITY_ACCOUNT_ADDRESS)
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalAnalyticsController()
    .withRemoteFeatureFlags({})
    .withOverrides({
      settings: {
        basicFunctionalityEnabled: true,
      },
      user: {
        ambiguousAddressEntries: {},
        seedphraseBackedUp: true,
      },
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
          },
          UserStorageController: {
            isBackupAndSyncEnabled,
            isAccountSyncingEnabled,
            isContactSyncingEnabled,
            isBackupAndSyncUpdateLoading: false,
          },
          AddressBookController: {
            addressBook,
          },
          KeyringController: {
            isUnlocked: true,
            keyrings: [
              {
                type: ExtendedKeyringTypes.hd,
                accounts: [IDENTITY_ACCOUNT_ADDRESS],
                metadata: {
                  id: 'identity-hd-keyring',
                  name: 'Wallet 1',
                },
              },
            ],
          },
          NotificationServicesController: {
            isNotificationServicesEnabled: false,
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
};
