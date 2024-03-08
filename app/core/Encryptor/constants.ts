import { KeyDerivationOptions } from './types';

export const SALT_BYTES_COUNT = 32;
export const SHA256_DIGEST_LENGTH = 256;
export const OLD_ITERATIONS_NUMBER = 5_000;
export const MINIMUM_ITERATIONS_NUMBER = 600_000;
export const DEFAULT_ITERATIONS_NUMBER = 900_000;
export const ENCRYPTION_LIBRARY = {
  original: 'original',
};

export const DEFAULT_DERIVATION_PARAMS: KeyDerivationOptions = {
  algorithm: 'PBKDF2',
  params: {
    iterations: DEFAULT_ITERATIONS_NUMBER,
  },
};
