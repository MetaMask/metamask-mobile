import { AesLib, AesForkedLib } from './aes-native';
import { QuickCryptoLib } from './quick-crypto';
import { ENCRYPTION_LIBRARY } from '../constants';
import { EncryptionLibrary } from '../types';

function getEncryptionLibrary(
  lib: string | undefined,
): EncryptionLibrary {
  return lib === ENCRYPTION_LIBRARY.original ? AesLib : AesForkedLib;
}

export {
  AesLib,
  AesForkedLib,
  QuickCryptoLib,
  getEncryptionLibrary,
};
