import { KeyDerivationOptions } from './types';

export const SALT_BYTES_COUNT = 32;
export const SHA256_DIGEST_LENGTH = 256;
export const ENCRYPTION_LIBRARY = {
  original: 'original',
};

export enum KeyDerivationIteration {
  Legacy = 5_000,
  Minimum = 600_000,
  Default = 900_000,
}

export const LEGACY_DERIVATION_PARAMS: KeyDerivationOptions = {
  algorithm: 'PBKDF2',
  params: {
    iterations: KeyDerivationIteration.Legacy,
  },
};

export const DERIVATION_PARAMS: KeyDerivationOptions = {
  algorithm: 'PBKDF2',
  params: {
    iterations: KeyDerivationIteration.Minimum,
  },
};
