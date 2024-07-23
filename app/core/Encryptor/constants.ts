import type { KeyDerivationOptions } from './types';

export const SALT_BYTES_COUNT = 32;
export const SHA256_DIGEST_LENGTH = 256;

/**
 * We use "OWASP2023" to indicate the source and year of the recommendation.
 * This will help us version the recommend number in case it changes in the future.
 * Source: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2
 */
export enum KeyDerivationIteration {
  // Legacy, kept for backward compatibility
  Legacy5000 = 5_000,
  // OWASP's 2023 recommendation for minimum iterations
  OWASP2023Minimum = 600_000,
  // Default suggested iterations based on OWASP's 2023 recommendation
  OWASP2023Default = 900_000,
}

/**
 * Supported SHA algorithms in react-native-aes v3.0.3
 */
export enum ShaAlgorithm {
  Sha256 = 'sha256',
  Sha512 = 'sha512',
}

/**
 * Supported cipher algorithms in react-native-aes v3.0.3
 *
 * Important Note: Make sure to validate the compatibility of the algorithm with the underlying library.
 * The react-native-aes-crypto does a string validation for the algorithm, so it's important to make sure
 * we're using the correct string.
 *
 * References:
 * - encrypt: https://github.com/MetaMask/metamask-mobile/pull/9947#:~:text=When-,encrypting,-and%20decypting%20the
 * - decrypt: https://github.com/MetaMask/metamask-mobile/pull/9947#:~:text=When%20encrypting%20and-,decypting,-the%20library%20uses
 */
export enum CipherAlgorithm {
  cbc = 'aes-cbc-pkcs7padding',
  ctr = 'aes-ctr-pkcs5padding',
}

/**
 * Used as a "tag" to identify the underlying encryption library.
 *
 * When no tag is specified, this means our "forked" encryption library has been used.
 */
export const ENCRYPTION_LIBRARY = {
  original: 'original',
};

/**
 * Key derivation algorithm used to generate keys from a password.
 */
export const KDF_ALGORITHM = 'PBKDF2';

/**
 * Default key derivation options.
 */
export const LEGACY_DERIVATION_OPTIONS: KeyDerivationOptions = {
  algorithm: KDF_ALGORITHM,
  params: {
    iterations: KeyDerivationIteration.Legacy5000,
  },
};

export const DERIVATION_OPTIONS_MINIMUM_OWASP2023: KeyDerivationOptions = {
  algorithm: KDF_ALGORITHM,
  params: {
    iterations: KeyDerivationIteration.OWASP2023Minimum,
  },
};

export const DERIVATION_OPTIONS_DEFAULT_OWASP2023: KeyDerivationOptions = {
  algorithm: KDF_ALGORITHM,
  params: {
    iterations: KeyDerivationIteration.OWASP2023Default,
  },
};
