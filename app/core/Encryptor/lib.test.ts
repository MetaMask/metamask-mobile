import { getEncryptionLibrary, AesLib, AesForkedLib } from './lib';
import {
  ENCRYPTION_LIBRARY,
  LEGACY_DERIVATION_OPTIONS,
  DERIVATION_OPTIONS_MINIMUM_OWASP2023,
} from './constants';

const mockPassword = 'mockPassword';
const mockSalt = '00112233445566778899001122334455';

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

    it.each([ENCRYPTION_LIBRARY.original, 'random-lib'])(
      'throws an error if the algorithm is not correct: %s',
      (_lib) => {
        const lib = getEncryptionLibrary(_lib);

        expect(
          async () =>
            await lib.deriveKey(mockPassword, mockSalt, {
              ...LEGACY_DERIVATION_OPTIONS,
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              algorithm: 'NotAValidKDFAlgorithm',
            }),
        ).rejects.toThrow('Unsupported KDF algorithm');
      },
    );

    it('derives a key when using a forked lib with legacy parameters', () => {
      const lib = getEncryptionLibrary('random-lib');

      expect(
        async () =>
          await lib.deriveKey(
            mockPassword,
            mockSalt,
            LEGACY_DERIVATION_OPTIONS,
          ),
      ).not.toBe(undefined);
    });

    it('throws an error if when using forked lib with a different number of iterations than expected', () => {
      const lib = getEncryptionLibrary('random-lib');

      expect(
        async () =>
          await lib.deriveKey(
            mockPassword,
            mockSalt,
            DERIVATION_OPTIONS_MINIMUM_OWASP2023,
          ),
      ).rejects.toThrow(
        `Invalid number of iterations, should be: ${LEGACY_DERIVATION_OPTIONS.params.iterations}`,
      );
    });
  });
});
