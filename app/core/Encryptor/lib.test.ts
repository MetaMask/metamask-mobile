import { getEncryptionLibrary, AesLib, AesForkedLib } from './lib';
import { ENCRYPTION_LIBRARY } from './constants';

describe('lib', () => {
  describe('getLib', () => {
    it('returns the original library', () => {
      const lib = AesLib;

      expect(getEncryptionLibrary(ENCRYPTION_LIBRARY.original)).toBe(lib);
    });

    it('returns the forked library in any other case', () => {
      const lib = AesForkedLib;

      expect(getEncryptionLibrary('random-lib')).toBe(lib);
      // Some older vault might not have the `lib` field, so it is considered `undefined`
      expect(getEncryptionLibrary(undefined)).toBe(lib);
    });
  });
});
