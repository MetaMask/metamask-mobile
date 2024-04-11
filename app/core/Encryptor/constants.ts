import type { KeyDerivationOptions } from './types';

export const SALT_BYTES_COUNT = 32;
export const SHA256_DIGEST_LENGTH = 256;
export const ENCRYPTION_LIBRARY = {
  original: 'original',
};

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

export const LEGACY_DERIVATION_PARAMS: KeyDerivationOptions = {
  algorithm: 'PBKDF2',
  params: {
    iterations: KeyDerivationIteration.Legacy5000,
  },
};

export const DERIVATION_PARAMS_MINIMUM_OWASP2023: KeyDerivationOptions = {
  algorithm: 'PBKDF2',
  params: {
    iterations: KeyDerivationIteration.OWASP2023Minimum,
  },
};

export const DERIVATION_PARAMS_DEFAULT_OWASP2023: KeyDerivationOptions = {
  algorithm: 'PBKDF2',
  params: {
    iterations: KeyDerivationIteration.OWASP2023Default,
  },
};
