import { stringToBytes } from '@metamask/utils';
import { pbkdf2 } from './pbkdf2';
import { NativeModules } from 'react-native';

const mockPassword = 'mockPassword';
const mockSalt = '00112233445566778899001122334455';

describe('pbkdf2', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the native implementation of pbkdf2 with main aes', async () => {
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

    await expect(
      pbkdf2(mockPasswordBytes, mockSaltBytes, mockIterations, mockKeyLength),
    ).resolves.toBeDefined();
  });

  it('throws on native module errors', async () => {
    NativeModules.Aes.pbkdf2 = jest
      .fn()
      .mockRejectedValue(new Error('Native module error'));

    const mockPasswordBytes = stringToBytes('password');
    const mockSaltBytes = stringToBytes('salt');

    await expect(
      pbkdf2(mockPasswordBytes, mockSaltBytes, 2048, 64),
    ).rejects.toThrow('Native module error');
  });

  it('does not fail when empty password', async () => {
    NativeModules.Aes.pbkdf2 = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          '0000000000000000000000000000000000000000000000000000000000000000',
        ),
      );

    const mockPasswordBytes = stringToBytes('');
    const mockSaltBytes = stringToBytes(mockSalt);

    const result = await pbkdf2(mockPasswordBytes, mockSaltBytes, 2048, 64);
    expect(result).toBeDefined();
  });

  it('does not fail when empty salt', async () => {
    NativeModules.Aes.pbkdf2 = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          'f347723a89a783c4de6a65d6a066d0e9a9c13319f8389f97d0566c79d87b6f80',
        ),
      );

    const mockPasswordBytes = stringToBytes(mockPassword);
    const mockSaltBytes = stringToBytes('');

    const result = await pbkdf2(mockPasswordBytes, mockSaltBytes, 2048, 64);
    expect(result).toBeDefined();
  });
});
