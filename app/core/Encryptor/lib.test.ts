import { getEncryptionLibrary, AesLib, AesForkedLib } from './lib';
import {
  ENCRYPTION_LIBRARY,
  LEGACY_DERIVATION_OPTIONS,
  DERIVATION_OPTIONS_MINIMUM_OWASP2023,
} from './constants';
import { stringToBytes } from '@metamask/utils';
import { NativeModules } from 'react-native';

const mockPassword = 'mockPassword';
const mockSalt = '00112233445566778899001122334455';

describe('lib', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
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
      async (_lib) => {
        const lib = getEncryptionLibrary(_lib);

        await expect(
          lib.deriveKey(mockPassword, mockSalt, {
            ...LEGACY_DERIVATION_OPTIONS,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            algorithm: 'NotAValidKDFAlgorithm',
          }),
        ).rejects.toThrow('Unsupported KDF algorithm');
      },
    );

    it('derives a key when using a forked lib with legacy parameters', async () => {
      const lib = getEncryptionLibrary('random-lib');

      await expect(
        lib.deriveKey(mockPassword, mockSalt, LEGACY_DERIVATION_OPTIONS),
      ).not.toBe(undefined);
    });

    it('throws an error when using forked lib with a different number of iterations than expected', async () => {
      const lib = getEncryptionLibrary('random-lib');

      await expect(
        lib.deriveKey(
          mockPassword,
          mockSalt,
          DERIVATION_OPTIONS_MINIMUM_OWASP2023,
        ),
      ).rejects.toThrow(
        `Invalid number of iterations, should be: ${LEGACY_DERIVATION_OPTIONS.params.iterations}`,
      );
    });

    it('should use the native implementation of pbkdf2 with main aes', async () => {
      NativeModules.Aes.pbkdf2 = jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            'd5217329ae279885bbfe1f25ac3aacc9adabc3c9c0b9bdbaa1c095c8b03dcad0d703f96a4fa453c960a9a3e540c585fd7e6406edae20b995dcef6a0883919457',
          ),
        );

      const mockPasswordBytes = stringToBytes(mockPassword);
      const mockSaltBytes = stringToBytes(mockSalt);
      const mockIterations = 2048;
      const mockKeyLength = 64; // 512 bits
      const lib = getEncryptionLibrary(ENCRYPTION_LIBRARY.original);

      await expect(
        lib.pbkdf2(
          mockPasswordBytes,
          mockSaltBytes,
          mockIterations,
          mockKeyLength,
        ),
      ).resolves.toBeDefined();
    });
    it('should use the native implementation of pbkdf2 with forked aes', async () => {
      NativeModules.AesForked.pbkdf2 = jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            'd5217329ae279885bbfe1f25ac3aacc9adabc3c9c0b9bdbaa1c095c8b03dcad0d703f96a4fa453c960a9a3e540c585fd7e6406edae20b995dcef6a0883919457',
          ),
        );

      const mockPasswordBytes = stringToBytes(mockPassword);
      const mockSaltBytes = stringToBytes(mockSalt);
      const mockIterations = 2048;
      const mockKeyLength = 64; // 512 bits
      const lib = getEncryptionLibrary(ENCRYPTION_LIBRARY.original);

      await expect(
        lib.pbkdf2(
          mockPasswordBytes,
          mockSaltBytes,
          mockIterations,
          mockKeyLength,
        ),
      ).resolves.toBeDefined();
    });
  });
});
