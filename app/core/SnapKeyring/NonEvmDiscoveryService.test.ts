import { NonEvmDiscoveryService } from './NonEvmDiscoveryService';
import StorageWrapper from '../../store/storage-wrapper';
import { NON_EVM_DISCOVERY_PENDING } from '../../constants/storage';

// Mock the dependencies using the same pattern as Authentication.test.ts
const storage: Record<string, unknown> = {};

jest.mock('../../store/storage-wrapper', () => ({
  getItem: jest.fn((key) => Promise.resolve(storage[key] ?? null)),
  setItem: jest.fn((key, value) => {
    storage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete storage[key];
    return Promise.resolve();
  }),
  clearAll: jest.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    return Promise.resolve();
  }),
}));

const mockSnapClient = {
  addDiscoveredAccounts: jest.fn(),
};

jest.mock('./MultichainWalletSnapClient', () => ({
  MultichainWalletSnapFactory: {
    createClient: () => mockSnapClient,
  },
  WalletClientType: {
    Solana: 'solana',
    Bitcoin: 'bitcoin',
  },
}));

describe('NonEvmDiscoveryService', () => {
  const mockKeyringId = 'test-keyring-id';

  beforeEach(() => {
    jest.clearAllMocks();
    StorageWrapper.clearAll();
  });

  afterEach(() => {
    StorageWrapper.clearAll();
    jest.restoreAllMocks();
  });

  describe('discoverAccounts', () => {
    it('should discover accounts successfully and clear pending flag', async () => {
      mockSnapClient.addDiscoveredAccounts.mockResolvedValue(5);

      const result = await NonEvmDiscoveryService.discoverAccounts(
        mockKeyringId,
      );

      // Should call discovery for both Bitcoin and Solana (if enabled)
      expect(mockSnapClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        mockKeyringId,
      );

      // Should clear the pending flag on success
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
        NON_EVM_DISCOVERY_PENDING,
      );
      expect(StorageWrapper.setItem).not.toHaveBeenCalled();
    });

    it('should handle discovery failures and set pending flag', async () => {
      mockSnapClient.addDiscoveredAccounts.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await NonEvmDiscoveryService.discoverAccounts(
        mockKeyringId,
      );

      expect(result).toBe(0);
      // Should set pending flag on failure
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        NON_EVM_DISCOVERY_PENDING,
        'true',
      );
      expect(StorageWrapper.removeItem).not.toHaveBeenCalled();
    });

    it('should handle partial failures correctly', async () => {
      // Mock mixed results - first succeeds, second fails
      mockSnapClient.addDiscoveredAccounts
        .mockResolvedValueOnce(3) // First call succeeds
        .mockRejectedValueOnce(new Error('Network error')); // Second call fails

      const result = await NonEvmDiscoveryService.discoverAccounts(
        mockKeyringId,
      );

      expect(result).toBe(3); // Only the successful discovery counts
      // Should still set pending flag due to partial failure
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        NON_EVM_DISCOVERY_PENDING,
        'true',
      );
    });
  });

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  describe('discoverBitcoinAccounts', () => {
    it('should discover Bitcoin accounts successfully', async () => {
      mockSnapClient.addDiscoveredAccounts.mockResolvedValue(2);

      const result = await NonEvmDiscoveryService.discoverBitcoinAccounts(
        mockKeyringId,
      );

      expect(result).toBe(2);
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
        `${NON_EVM_DISCOVERY_PENDING}_bitcoin`,
      );
    });

    it('should handle Bitcoin discovery failure', async () => {
      mockSnapClient.addDiscoveredAccounts.mockRejectedValue(
        new Error('Bitcoin network error'),
      );

      const result = await NonEvmDiscoveryService.discoverBitcoinAccounts(
        mockKeyringId,
      );

      expect(result).toBe(0);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        `${NON_EVM_DISCOVERY_PENDING}_bitcoin`,
        'true',
      );
    });
  });

  describe('retryBitcoinIfPending', () => {
    it('should retry Bitcoin discovery when pending flag is set', async () => {
      await StorageWrapper.setItem(
        `${NON_EVM_DISCOVERY_PENDING}_bitcoin`,
        'true',
      );
      mockSnapClient.addDiscoveredAccounts.mockResolvedValue(2);

      await NonEvmDiscoveryService.retryBitcoinIfPending(mockKeyringId);

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(
        `${NON_EVM_DISCOVERY_PENDING}_bitcoin`,
      );
      expect(mockSnapClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        mockKeyringId,
      );
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
        `${NON_EVM_DISCOVERY_PENDING}_bitcoin`,
      );
    });

    it('should not retry when Bitcoin pending flag is not set', async () => {
      await StorageWrapper.removeItem(`${NON_EVM_DISCOVERY_PENDING}_bitcoin`);

      await NonEvmDiscoveryService.retryBitcoinIfPending(mockKeyringId);

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(
        `${NON_EVM_DISCOVERY_PENDING}_bitcoin`,
      );
      expect(mockSnapClient.addDiscoveredAccounts).not.toHaveBeenCalled();
    });
  });
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  describe('discoverSolanaAccounts', () => {
    it('should discover Solana accounts successfully', async () => {
      mockSnapClient.addDiscoveredAccounts.mockResolvedValue(3);

      const result = await NonEvmDiscoveryService.discoverSolanaAccounts(
        mockKeyringId,
      );

      expect(result).toBe(3);
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
        `${NON_EVM_DISCOVERY_PENDING}_solana`,
      );
    });

    it('should handle Solana discovery failure', async () => {
      mockSnapClient.addDiscoveredAccounts.mockRejectedValue(
        new Error('Solana network error'),
      );

      const result = await NonEvmDiscoveryService.discoverSolanaAccounts(
        mockKeyringId,
      );

      expect(result).toBe(0);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        `${NON_EVM_DISCOVERY_PENDING}_solana`,
        'true',
      );
    });
  });

  describe('retrySolanaIfPending', () => {
    it('should retry Solana discovery when pending flag is set', async () => {
      await StorageWrapper.setItem(
        `${NON_EVM_DISCOVERY_PENDING}_solana`,
        'true',
      );
      mockSnapClient.addDiscoveredAccounts.mockResolvedValue(1);

      await NonEvmDiscoveryService.retrySolanaIfPending(mockKeyringId);

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(
        `${NON_EVM_DISCOVERY_PENDING}_solana`,
      );
      expect(mockSnapClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        mockKeyringId,
      );
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
        `${NON_EVM_DISCOVERY_PENDING}_solana`,
      );
    });

    it('should not retry when Solana pending flag is not set', async () => {
      await StorageWrapper.removeItem(`${NON_EVM_DISCOVERY_PENDING}_solana`);

      await NonEvmDiscoveryService.retrySolanaIfPending(mockKeyringId);

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(
        `${NON_EVM_DISCOVERY_PENDING}_solana`,
      );
      expect(mockSnapClient.addDiscoveredAccounts).not.toHaveBeenCalled();
    });
  });
  ///: END:ONLY_INCLUDE_IF

  describe('retryIfPending', () => {
    it('should retry discovery when pending flag is set', async () => {
      await StorageWrapper.setItem(NON_EVM_DISCOVERY_PENDING, 'true');
      mockSnapClient.addDiscoveredAccounts.mockResolvedValue(2);

      await NonEvmDiscoveryService.retryIfPending(mockKeyringId);

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(
        NON_EVM_DISCOVERY_PENDING,
      );
      expect(mockSnapClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        mockKeyringId,
      );
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
        NON_EVM_DISCOVERY_PENDING,
      );
    });

    it('should not retry when pending flag is not set', async () => {
      await StorageWrapper.removeItem(NON_EVM_DISCOVERY_PENDING);

      await NonEvmDiscoveryService.retryIfPending(mockKeyringId);

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(
        NON_EVM_DISCOVERY_PENDING,
      );
      expect(mockSnapClient.addDiscoveredAccounts).not.toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      const originalGetItem = StorageWrapper.getItem;
      StorageWrapper.getItem = jest
        .fn()
        .mockRejectedValueOnce(new Error('Storage read error'));

      await expect(
        NonEvmDiscoveryService.retryIfPending(mockKeyringId),
      ).resolves.not.toThrow();

      expect(mockSnapClient.addDiscoveredAccounts).not.toHaveBeenCalled();

      // Restore original method
      StorageWrapper.getItem = originalGetItem;
    });
  });
});
