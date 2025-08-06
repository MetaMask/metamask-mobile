import migration91 from './091';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../util/device';

// Mock FilesystemStorage
jest.mock('redux-persist-filesystem-storage');
const mockFilesystemStorage = FilesystemStorage as jest.Mocked<
  typeof FilesystemStorage
>;

jest.mock('../../util/device');
const mockDevice = Device as jest.Mocked<typeof Device>;

describe('Migration 91', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevice.isIos.mockReturnValue(true);
    mockFilesystemStorage.setItem.mockResolvedValue();
  });

  it('should migrate existing engine data to individual controller storage', async () => {
    const mockState = {
      engine: {
        backgroundState: {
          KeyringController: {
            vault: 'encrypted-vault-data',
            isUnlocked: false,
          },
          NetworkController: {
            network: 'mainnet',
            chainId: '1',
          },
          TransactionController: {
            transactions: [{ id: '1', status: 'pending' }],
            methodData: { '0x123': { method: 'transfer' } },
          },
        },
      },
    };

    const result = await migration91(mockState);

    expect(mockFilesystemStorage.setItem).toHaveBeenCalledTimes(3);

    expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
      'persist:KeyringController',
      JSON.stringify({
        vault: 'encrypted-vault-data',
        isUnlocked: false,
      }),
      true,
    );

    expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
      'persist:NetworkController',
      JSON.stringify({
        network: 'mainnet',
        chainId: '1',
      }),
      true,
    );

    expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
      'persist:TransactionController',
      JSON.stringify({
        transactions: [{ id: '1', status: 'pending' }],
        methodData: { '0x123': { method: 'transfer' } },
      }),
      true,
    );

    expect(result).toEqual({
      engine: {
        backgroundState: {},
      },
    });
  });

  it('should handle empty engine data gracefully', async () => {
    const mockState = {
      engine: {
        backgroundState: {},
      },
    };

    const result = await migration91(mockState);

    expect(mockFilesystemStorage.setItem).not.toHaveBeenCalled();

    expect(result).toEqual(mockState);
  });

  it('should handle missing engine data gracefully', async () => {
    const mockState = {
      engine: {},
    };

    const result = await migration91(mockState);

    expect(mockFilesystemStorage.setItem).not.toHaveBeenCalled();
    // Should return state unchanged
    expect(result).toEqual(mockState);
  });

  it('should handle partial controller data', async () => {
    const mockState = {
      engine: {
        backgroundState: {
          KeyringController: {
            vault: 'encrypted-vault-data',
          },
          TransactionController: {
            transactions: [],
          },
        },
      },
    };

    const result = await migration91(mockState);

    expect(mockFilesystemStorage.setItem).toHaveBeenCalledTimes(2);

    expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
      'persist:KeyringController',
      JSON.stringify({ vault: 'encrypted-vault-data' }),
      true,
    );

    expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
      'persist:TransactionController',
      JSON.stringify({ transactions: [] }),
      true,
    );

    expect(result).toEqual({
      engine: {
        backgroundState: {},
      },
    });
  });

  it('should handle storage errors gracefully', async () => {
    const mockState = {
      engine: {
        backgroundState: {
          KeyringController: {
            vault: 'encrypted-vault-data',
          },
          NetworkController: {
            network: 'mainnet',
          },
        },
      },
    };

    mockFilesystemStorage.setItem
      .mockRejectedValueOnce(new Error('Storage error'))
      .mockResolvedValueOnce();

    const result = await migration91(mockState);

    expect(mockFilesystemStorage.setItem).toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      engine: {
        backgroundState: {},
      },
    });
  });

  it('should handle invalid state gracefully', async () => {
    const invalidState = null;

    const result = await migration91(invalidState);

    expect(result).toBe(invalidState);
    expect(mockFilesystemStorage.setItem).not.toHaveBeenCalled();
  });
});
