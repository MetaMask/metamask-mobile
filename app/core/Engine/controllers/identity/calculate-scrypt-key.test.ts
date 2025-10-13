import { calculateScryptKey } from './calculate-scrypt-key';
import { scrypt } from 'react-native-fast-crypto';
import {
  getGenericPassword,
  setGenericPassword,
  STORAGE_TYPE,
} from 'react-native-keychain';
import Logger from '../../../../util/Logger';

// we are using this node import for testing purposes
// eslint-disable-next-line import/no-nodejs-modules
import mockCrypto from 'crypto';

jest.mock('react-native-quick-crypto', () => ({
  createHash: (algorithm: string) => mockCrypto.createHash(algorithm),
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'MOCK_AccessibleWhenUnlockedThisDeviceOnly',
  },
  STORAGE_TYPE: {
    FB: 'FacebookConceal',
    AES: 'KeystoreAES',
    AES_CBC: 'KeystoreAESCBC',
    AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth',
    AES_GCM: 'KeystoreAESGCM',
    RSA: 'KeystoreRSAECB',
  },
  setGenericPassword: jest.fn().mockResolvedValue({
    service: 'mockService',
    storage: 'mockStorage',
  }),
  getGenericPassword: jest.fn().mockResolvedValue(false),
}));

jest.mock('react-native-fast-crypto', () => ({
  scrypt: jest.fn(),
}));

describe('calculateScryptKey', () => {
  const arrangeInputs = () => {
    const passwd = new Uint8Array([1, 2, 3, 4]);
    const salt = new Uint8Array([5, 6, 7, 8]);
    const N = 16384;
    const r = 8;
    const p = 1;
    const size = 64;
    return {
      passwd,
      salt,
      N,
      r,
      p,
      size,
    };
  };

  const arrangeMocks = () => {
    const mockGetGenericPassword = jest.mocked(getGenericPassword);
    const mockSetGenericPassword = jest.mocked(setGenericPassword);

    const mockScryptResult = new Uint8Array([1, 3, 3, 7]);
    const mockScrypt = jest.mocked(scrypt).mockResolvedValue(mockScryptResult);
    return {
      mockGetGenericPassword,
      mockSetGenericPassword,
      mockScrypt,
      mockScryptResult,
    };
  };

  const arrange = () => {
    const inputs = arrangeInputs();
    const mocks = arrangeMocks();
    const cachedResultStr = Buffer.from(mocks.mockScryptResult).toString('hex');
    return { inputs, mocks, cachedResultStr };
  };

  type Arrange = ReturnType<typeof arrange>;
  const arrangeAct = async (overrides?: (a: Arrange) => void) => {
    // Arrange
    const arrangeData = arrange();
    overrides?.(arrangeData);

    // Act
    const { inputs } = arrangeData;
    await calculateScryptKey(
      inputs.passwd,
      inputs.salt,
      inputs.N,
      inputs.r,
      inputs.p,
      inputs.size,
    );

    return arrangeData;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached key if available', async () => {
    const result = await arrangeAct(({ mocks, cachedResultStr }) => {
      mocks.mockGetGenericPassword.mockResolvedValue({
        password: cachedResultStr,
        service: 'mockService',
        storage: STORAGE_TYPE.AES_GCM,
        username: 'mockUser',
      });
    });
    // Assert - Storage called & new scrypt key not generated
    expect(result.mocks.mockGetGenericPassword).toHaveBeenCalled();
    expect(result.mocks.mockScrypt).not.toHaveBeenCalled();
  });

  it('computes new key if no cache is available', async () => {
    const result = await arrangeAct(({ mocks }) => {
      mocks.mockGetGenericPassword.mockResolvedValue(false);
    });

    // Assert - Script key generated
    expect(result.mocks.mockGetGenericPassword).toHaveBeenCalled();
    expect(result.mocks.mockScrypt).toHaveBeenCalled();
    expect(result.mocks.mockSetGenericPassword).toHaveBeenCalled();
  });

  it('logs error if fails to get cache', async () => {
    const mockLogError = jest
      .spyOn(Logger, 'error')
      .mockImplementation(jest.fn());
    const result = await arrangeAct(({ mocks }) => {
      mocks.mockGetGenericPassword.mockRejectedValue(new Error('TEST ERROR'));
    });

    // Assert - Scrypt key generated & Error Logged
    expect(result.mocks.mockGetGenericPassword).toHaveBeenCalled();
    expect(result.mocks.mockScrypt).toHaveBeenCalled();
    expect(result.mocks.mockSetGenericPassword).toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });

  it('logs error if fails to set cache', async () => {
    const mockLogError = jest
      .spyOn(Logger, 'error')
      .mockImplementation(jest.fn());
    const result = await arrangeAct(({ mocks }) => {
      mocks.mockGetGenericPassword.mockResolvedValue(false);
      mocks.mockSetGenericPassword.mockRejectedValue(new Error('TEST ERROR'));
    });

    // Assert - Scrypt key generated & Error Logged
    expect(result.mocks.mockGetGenericPassword).toHaveBeenCalled();
    expect(result.mocks.mockScrypt).toHaveBeenCalled();
    expect(result.mocks.mockSetGenericPassword).toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });
});
