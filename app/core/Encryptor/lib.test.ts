import { getEncryptionLibrary, AesLib } from './lib';
import { ENCRYPTION_LIBRARY, LEGACY_DERIVATION_OPTIONS } from './constants';

const mockPassword = 'mockPassword';
const mockSalt = '00112233445566778899001122334455';

describe('lib', () => {
  describe('getLib', () => {
    it('returns the original library', () => {
      const lib = AesLib;

      expect(getEncryptionLibrary()).toBe(lib);
    });

    it.each([ENCRYPTION_LIBRARY.original, 'random-lib'])(
      'throws an error if the algorithm is not correct: %s',
      async (_lib) => {
        const lib = getEncryptionLibrary();

        await expect(
          lib.deriveKey(mockPassword, mockSalt, {
            ...LEGACY_DERIVATION_OPTIONS,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            algorithm: 'NotAValidKDFAlgorithm',
          }),
        ).rejects.toThrow('Unsupported KDF algorithm');
      },
    );
  });
});
