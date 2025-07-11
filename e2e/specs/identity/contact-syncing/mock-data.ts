import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { createEncryptedResponse } from '../utils/user-storage/generateEncryptedData';
import { IDENTITY_TEAM_STORAGE_KEY } from '../utils/constants';

/**
 * This array represents the contacts mock data before it is encrypted and sent to UserStorage.
 * Each object within the array represents a UserStorageContact, which includes properties such as:
 * - v: The version of the User Storage.
 * - a: The address of the contact.
 * - i: The id of the contact.
 * - n: The name of the contact.
 * - nlu: The name last updated timestamp of the contact.
 */
export const contactsToMockForContactsSync = [
  {
    v: '1',
    a: '0x123456789012345678901234567890abcdef1234',
    n: 'Hello from contact 1',
    c: '0x1',
    m: 'First contact',
    lu: 1738590287,
  },
  {
    v: '1',
    a: '0xabcdef1234567890123456789012345678901234',
    n: 'Hello from contact 2',
    c: '0x1',
    m: 'Second contact',
    lu: 1738590287,
  },
];

/**
 * Generates a mock response for contact synchronization.
 *
 * This function asynchronously creates an encrypted mock response for each contact
 * in the `contactsToMockForContactsSync` array. The encrypted responses are created
 * using the `createEncryptedMockResponse` function, which takes a configuration object
 * containing the contact data, a storage key, and a feature key.
 *
 * @returns A promise that resolves to an array of encrypted mock responses.
 */
export const getContactsSyncMockResponse = async () => {
  const encryptedResponse = await Promise.all(
    contactsToMockForContactsSync.map((contact) =>
      createEncryptedResponse({
        data: contact,
        storageKey: IDENTITY_TEAM_STORAGE_KEY,
        path: `${USER_STORAGE_FEATURE_NAMES.addressBook}.${contact.a}`,
      }),
    ),
  );

  return encryptedResponse;
};
