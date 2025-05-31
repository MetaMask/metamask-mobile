import { AesLib } from './aes-native';
import { QuickCryptoLib } from './quick-crypto';
import { ENCRYPTION_LIBRARY } from '../constants';
import { EncryptionLibrary } from '../types';

function getEncryptionLibrary(lib: string | undefined): EncryptionLibrary {
  switch (lib) {
    case ENCRYPTION_LIBRARY.original:
      return AesLib;
    case ENCRYPTION_LIBRARY.quickCrypto:
      return QuickCryptoLib;
    default:
      return QuickCryptoLib;
  }
}

export { AesLib, QuickCryptoLib, getEncryptionLibrary };
