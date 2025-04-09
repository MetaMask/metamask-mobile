import {
  Encryption,
  UserStoragePathWithFeatureAndKey,
  createSHA256Hash,
  getFeatureAndKeyFromPath,
} from '@metamask/profile-sync-controller/sdk';

/**
 * Encrypts the given data object using the specified storage key.
 *
 * @param data - The data object to be encrypted.
 * @param storageKey - The key used for encryption.
 * @returns A promise that resolves to the encrypted string.
 */
const encryptData = async (data, storageKey) =>
  await Encryption.encryptString(JSON.stringify(data), storageKey);

/**
 * Generates an encrypted hash using the provided user storage path and storage key.
 *
 * @param path - The user storage path which includes the feature and key.
 * @param storageKey - The storage key to be used in the hash generation.
 * @returns The generated SHA-256 hash as a string.
 */
const generateEncryptedHash = (path, storageKey) => {
  const { key: featureKey } = getFeatureAndKeyFromPath(path);
  return createSHA256Hash(featureKey + storageKey);
};

/**
 * Creates an encrypted response object containing a hashed key and encrypted data.
 * This will simulate how our clients will encrypt data before sending to our User Storagrget
 *
 * @param options - The options for creating the encrypted response.
 * @param options.data - The data to be encrypted.
 * @param options.storageKey - The key used for encryption.
 * @param options.path - The user storage path with feature and key.
 * @returns A promise that resolves to an object containing the hashed key and encrypted data.
 */
export const createEncryptedResponse = async (options) => {
  const { data, storageKey: key, path } = options;
  return {
    HashedKey: generateEncryptedHash(path, key),
    Data: await encryptData(data, key),
  };
};
