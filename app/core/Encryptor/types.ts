import type { Json } from '@metamask/utils';

/**
 * Parameters used for key derivation.
 * @interface KeyParams
 * @property iterations - The number of iterations to use in the key derivation process.
 */
export interface KeyParams {
  iterations: number;
}

/**
 * Options for key derivation, specifying the algorithm and parameters to use.
 * @interface KeyDerivationOptions
 * @property algorithm - The name of the algorithm to use for key derivation.
 * @property params - The parameters to use with the specified algorithm.
 */
export interface KeyDerivationOptions {
  algorithm: string;
  params: KeyParams;
}

/**
 * The result of an encryption operation.
 * @interface EncryptionResult
 * @property cipher - The encrypted data.
 * @property iv - The initialization vector used in the encryption process.
 * @property [salt] - The salt used in the encryption process, if applicable.
 * @property [lib] - The library or algorithm used for encryption, if applicable.
 * @property [keyMetadata] - Metadata about the key derivation, if key derivation was used.
 */
export interface EncryptionResult {
  cipher: string;
  iv: string;
  salt?: string;
  lib?: string;
  keyMetadata?: KeyDerivationOptions;
}

/**
 * Defines the structure for a generic encryption utility.
 * This utility provides methods for encrypting and decrypting objects
 * using a specified password. It may also include an optional method
 * for checking if an encrypted vault is up to date with the desired
 * encryption algorithm and parameters.
 */
export interface GenericEncryptor {
  /**
   * Encrypts the given object with the given password.
   *
   * @param password - The password to encrypt with.
   * @param object - The object to encrypt.
   * @returns The encrypted string.
   */
  encrypt: (password: string, object: Json) => Promise<string>;
  /**
   * Decrypts the given encrypted string with the given password.
   *
   * @param password - The password to decrypt with.
   * @param encryptedString - The encrypted string to decrypt.
   * @returns The decrypted object.
   */
  decrypt: (password: string, encryptedString: string) => Promise<unknown>;
  /**
   * Optional vault migration helper. Checks if the provided vault is up to date
   * with the desired encryption algorithm.
   *
   * @param vault - The encrypted string to check.
   * @param targetDerivationParams - The desired target derivation params.
   * @returns The updated encrypted string.
   */
  isVaultUpdated?: (
    vault: string,
    targetDerivationParams?: KeyDerivationOptions,
  ) => boolean;
}
