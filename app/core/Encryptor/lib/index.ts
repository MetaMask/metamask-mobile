import { AesLib, AesForkedLib } from './aes-native';
import { quickCryptoLib } from './quick-crypto';
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
  quickCryptoLib,
  getEncryptionLibrary,
};
