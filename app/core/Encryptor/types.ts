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
 * @property data - The encrypted data.
 * @property iv - The initialization vector used in the encryption process.
 * @property [salt] - The salt used in the encryption process, if applicable.
 * @property [lib] - The library or algorithm used for encryption, if applicable.
 * @property [keyMetadata] - Metadata about the key derivation, if key derivation was used.
 */
export interface EncryptionResult {
  data: string;
  iv: string;
  salt?: string;
  lib?: string;
  keyMetadata?: KeyDerivationOptions;
}
