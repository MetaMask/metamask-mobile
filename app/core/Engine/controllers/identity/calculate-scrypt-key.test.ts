import { calculateScryptKey, generateKeyHash } from './calculate-scrypt-key';
import storageWrapper from '../../../../store/storage-wrapper';
import { scrypt } from 'react-native-fast-crypto';
import Logger from '../../../../util/Logger';

jest.mock('../../../../store/storage-wrapper');
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
    const mockGetItem = jest.mocked(storageWrapper.getItem);
    const mockSetItem = jest.mocked(storageWrapper.setItem);

    const mockScryptResult = new Uint8Array([1, 3, 3, 7]);
    const mockScrypt = jest.mocked(scrypt).mockResolvedValue(mockScryptResult);
    return { mockGetItem, mockSetItem, mockScrypt, mockScryptResult };
  };

  const arrange = () => {
    const inputs = arrangeInputs();
    const mocks = arrangeMocks();
    const cacheHash = generateKeyHash(
      inputs.passwd,
      inputs.salt,
      inputs.N,
      inputs.r,
      inputs.p,
      inputs.size,
    );
    const cachedResultStr = Buffer.from(mocks.mockScryptResult).toString('hex');
    return { inputs, mocks, cacheHash, cachedResultStr };
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
    const result = await arrangeAct(({ mocks, cacheHash, cachedResultStr }) => {
      mocks.mockGetItem.mockResolvedValue(
        JSON.stringify({ cacheHash, key: cachedResultStr }),
      );
    });

    // Assert - Storage called & new scrypt key not generated
    expect(result.mocks.mockGetItem).toHaveBeenCalled();
    expect(result.mocks.mockScrypt).not.toHaveBeenCalled();
  });

  it('computes new key if no cache is available', async () => {
    const result = await arrangeAct(({ mocks }) => {
      mocks.mockGetItem.mockResolvedValue(null);
    });

    // Assert - Script key generated
    expect(result.mocks.mockGetItem).toHaveBeenCalled();
    expect(result.mocks.mockScrypt).toHaveBeenCalled();
    expect(result.mocks.mockSetItem).toHaveBeenCalled();
  });

  it('logs error if fails to get cache', async () => {
    const mockLogError = jest
      .spyOn(Logger, 'error')
      .mockImplementation(jest.fn());
    const result = await arrangeAct(({ mocks }) => {
      mocks.mockGetItem.mockRejectedValue(new Error('TEST ERROR'));
    });

    // Assert - Scrypt key generated & Error Logged
    expect(result.mocks.mockGetItem).toHaveBeenCalled();
    expect(result.mocks.mockScrypt).toHaveBeenCalled();
    expect(result.mocks.mockSetItem).toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });

  it('logs error if fails to set cache', async () => {
    const mockLogError = jest
      .spyOn(Logger, 'error')
      .mockImplementation(jest.fn());
    const result = await arrangeAct(({ mocks }) => {
      mocks.mockSetItem.mockRejectedValue(new Error('TEST ERROR'));
    });

    // Assert - Scrypt key generated & Error Logged
    expect(result.mocks.mockGetItem).toHaveBeenCalled();
    expect(result.mocks.mockScrypt).toHaveBeenCalled();
    expect(result.mocks.mockSetItem).toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });
});
