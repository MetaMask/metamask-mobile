import { BridgeTokensCacheManager } from './BridgeTokensCacheManager';
import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';
import { Hex, CaipChainId } from '@metamask/utils';
import { BridgeToken } from '../types';

// Mock dependencies
jest.mock('../../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('BridgeTokensCacheManager', () => {
  let cacheManager: BridgeTokensCacheManager;
  let mockStorageWrapper: jest.Mocked<typeof StorageWrapper>;
  let mockLogger: jest.Mocked<typeof Logger>;

  const mockChainId: Hex = '0x1';
  const mockSolanaChainId: CaipChainId =
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
  const mockTtl = 30 * 60 * 1000; // 30 minutes

  const mockBridgeTokens: Record<string, BridgeToken> = {
    '0x0000000000000000000000000000000000000001': {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN1',
      name: 'Token One',
      image: 'https://token1.com/logo.png',
      decimals: 18,
      chainId: '0x1',
    },
    '0x0000000000000000000000000000000000000002': {
      address: '0x0000000000000000000000000000000000000002',
      symbol: 'TOKEN2',
      name: 'Token Two',
      image: 'https://token2.com/logo.png',
      decimals: 6,
      chainId: '0x1',
    },
  };

  const mockSolanaTokens: Record<string, BridgeToken> = {
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/So11111111111111111111111111111111111111112':
      {
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        image: 'https://solana.com/logo.png',
        decimals: 9,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    mockStorageWrapper = StorageWrapper as jest.Mocked<typeof StorageWrapper>;
    mockLogger = Logger as jest.Mocked<typeof Logger>;

    cacheManager = new BridgeTokensCacheManager({
      ttlMs: mockTtl,
      storagePrefix: 'test_bridge_tokens_cache',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getCachedTokens', () => {
    it('returns undefined when no cache exists', async () => {
      // Arrange
      mockStorageWrapper.getItem.mockResolvedValue(null);

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        'test_bridge_tokens_cache_0x1',
      );
    });

    it('returns cached tokens when valid cache exists', async () => {
      // Arrange
      const cachedData = {
        tokens: mockBridgeTokens,
        timestamp: Date.now(),
        chainId: mockChainId,
      };
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toEqual(mockBridgeTokens);
    });

    it('removes and returns undefined when cache is expired', async () => {
      // Arrange
      const expiredTimestamp = Date.now() - mockTtl - 1000; // 1 second past TTL
      const cachedData = {
        tokens: mockBridgeTokens,
        timestamp: expiredTimestamp,
        chainId: mockChainId,
      };
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorageWrapper.removeItem).toHaveBeenCalledWith(
        'test_bridge_tokens_cache_0x1',
      );
    });

    it('removes and returns undefined when chainId mismatch', async () => {
      // Arrange
      const cachedData = {
        tokens: mockBridgeTokens,
        timestamp: Date.now(),
        chainId: '0x89', // Different chain ID
      };
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorageWrapper.removeItem).toHaveBeenCalledWith(
        'test_bridge_tokens_cache_0x1',
      );
    });

    it('removes and returns undefined when tokens validation fails', async () => {
      // Arrange - tokens with wrong chainId
      const invalidTokens = {
        '0x0000000000000000000000000000000000000001': {
          ...mockBridgeTokens['0x0000000000000000000000000000000000000001'],
          chainId: '0x89', // Wrong chain ID
        },
      };
      const cachedData = {
        tokens: invalidTokens,
        timestamp: Date.now(),
        chainId: mockChainId,
      };
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorageWrapper.removeItem).toHaveBeenCalledWith(
        'test_bridge_tokens_cache_0x1',
      );
    });

    it('handles invalid JSON gracefully', async () => {
      // Arrange
      mockStorageWrapper.getItem.mockResolvedValue('invalid-json');

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('handles storage errors gracefully', async () => {
      // Arrange
      mockStorageWrapper.getItem.mockRejectedValue(new Error('Storage error'));

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        `BridgeTokensCacheManager: Error reading cache for chainId ${mockChainId}`,
      );
    });

    it('validates Solana tokens correctly', async () => {
      // Arrange
      const cachedData = {
        tokens: mockSolanaTokens,
        timestamp: Date.now(),
        chainId: mockSolanaChainId,
      };
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheManager.getCachedTokens(mockSolanaChainId);

      // Assert
      expect(result).toEqual(mockSolanaTokens);
    });
  });

  describe('setCachedTokens', () => {
    it('stores tokens in cache with correct structure', async () => {
      // Arrange
      const currentTime = Date.now();

      // Act
      await cacheManager.setCachedTokens(mockChainId, mockBridgeTokens);

      // Assert
      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        'test_bridge_tokens_cache_0x1',
        JSON.stringify({
          tokens: mockBridgeTokens,
          timestamp: currentTime,
          chainId: mockChainId,
        }),
      );
    });

    it('handles storage errors gracefully', async () => {
      // Arrange
      mockStorageWrapper.setItem.mockRejectedValue(new Error('Storage error'));

      // Act & Assert - should not throw
      await expect(
        cacheManager.setCachedTokens(mockChainId, mockBridgeTokens),
      ).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        `BridgeTokensCacheManager: Error writing cache for chainId ${mockChainId}`,
      );
    });

    it('stores Solana tokens correctly', async () => {
      // Arrange
      const currentTime = Date.now();

      // Act
      await cacheManager.setCachedTokens(mockSolanaChainId, mockSolanaTokens);

      // Assert
      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        'test_bridge_tokens_cache_solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        JSON.stringify({
          tokens: mockSolanaTokens,
          timestamp: currentTime,
          chainId: mockSolanaChainId,
        }),
      );
    });
  });

  describe('removeCachedTokens', () => {
    it('removes tokens from storage', async () => {
      // Act
      await cacheManager.removeCachedTokens(mockChainId);

      // Assert
      expect(mockStorageWrapper.removeItem).toHaveBeenCalledWith(
        'test_bridge_tokens_cache_0x1',
      );
    });

    it('handles storage errors gracefully', async () => {
      // Arrange
      mockStorageWrapper.removeItem.mockRejectedValue(
        new Error('Storage error'),
      );

      // Act & Assert - should not throw
      await expect(
        cacheManager.removeCachedTokens(mockChainId),
      ).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        `BridgeTokensCacheManager: Error removing cache for chainId ${mockChainId}`,
      );
    });
  });

  describe('hasCachedTokens', () => {
    it('returns true when valid cache exists', async () => {
      // Arrange
      const cachedData = {
        tokens: mockBridgeTokens,
        timestamp: Date.now(),
        chainId: mockChainId,
      };
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheManager.hasCachedTokens(mockChainId);

      // Assert
      expect(result).toBe(true);
    });

    it('returns false when no cache exists', async () => {
      // Arrange
      mockStorageWrapper.getItem.mockResolvedValue(null);

      // Act
      const result = await cacheManager.hasCachedTokens(mockChainId);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false when cache is invalid', async () => {
      // Arrange
      const expiredTimestamp = Date.now() - mockTtl - 1000;
      const cachedData = {
        tokens: mockBridgeTokens,
        timestamp: expiredTimestamp,
        chainId: mockChainId,
      };
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheManager.hasCachedTokens(mockChainId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('TTL functionality', () => {
    it.each([
      ['valid cache', mockTtl - 1000, true],
      ['expired cache', mockTtl + 1000, false],
      ['cache at exact TTL', mockTtl, false],
    ])('handles %s correctly', async (_, ageMs, shouldBeValid) => {
      // Arrange
      const cacheTimestamp = Date.now() - ageMs;
      const cachedData = {
        tokens: mockBridgeTokens,
        timestamp: cacheTimestamp,
        chainId: mockChainId,
      };
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      if (shouldBeValid) {
        expect(result).toEqual(mockBridgeTokens);
        expect(mockStorageWrapper.removeItem).not.toHaveBeenCalled();
      } else {
        expect(result).toBeUndefined();
        expect(mockStorageWrapper.removeItem).toHaveBeenCalled();
      }
    });
  });

  describe('token validation', () => {
    it.each([
      ['EVM tokens with matching chainId', mockBridgeTokens, mockChainId, true],
      [
        'Solana tokens with matching chainId',
        mockSolanaTokens,
        mockSolanaChainId,
        true,
      ],
      [
        'EVM tokens with mismatched chainId',
        {
          '0x0000000000000000000000000000000000000001': {
            ...mockBridgeTokens['0x0000000000000000000000000000000000000001'],
            chainId: '0x89', // Wrong chain
          },
        },
        mockChainId,
        false,
      ],
      [
        'Solana tokens with mismatched chainId',
        {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/So11111111111111111111111111111111111111112':
            {
              ...mockSolanaTokens[
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/So11111111111111111111111111111111111111112'
              ],
              chainId: 'solana:different-chain',
            },
        },
        mockSolanaChainId,
        false,
      ],
      ['empty tokens object', {}, mockChainId, true],
    ])('validates %s correctly', async (_, tokens, chainId, shouldBeValid) => {
      // Arrange
      const cachedData = {
        tokens,
        timestamp: Date.now(),
        chainId,
      };
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await cacheManager.getCachedTokens(chainId);

      // Assert
      if (shouldBeValid) {
        expect(result).toEqual(tokens);
        expect(mockStorageWrapper.removeItem).not.toHaveBeenCalled();
      } else {
        expect(result).toBeUndefined();
        expect(mockStorageWrapper.removeItem).toHaveBeenCalled();
      }
    });
  });

  describe('cache key generation', () => {
    it.each([
      ['EVM chain', '0x1', 'test_bridge_tokens_cache_0x1'],
      ['Polygon chain', '0x89', 'test_bridge_tokens_cache_0x89'],
      [
        'Solana chain',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        'test_bridge_tokens_cache_solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ],
    ])(
      'generates correct cache key for %s',
      async (_, chainId, expectedKey) => {
        // Act
        await cacheManager.getCachedTokens(chainId as Hex | CaipChainId);

        // Assert
        expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(expectedKey);
      },
    );
  });

  describe('edge cases', () => {
    it('handles cache with missing tokens property', async () => {
      // Arrange
      const invalidCachedData = {
        timestamp: Date.now(),
        chainId: mockChainId,
        // Missing tokens property
      };
      mockStorageWrapper.getItem.mockResolvedValue(
        JSON.stringify(invalidCachedData),
      );

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorageWrapper.removeItem).toHaveBeenCalled();
    });

    it('handles cache with missing timestamp property', async () => {
      // Arrange
      const invalidCachedData = {
        tokens: mockBridgeTokens,
        chainId: mockChainId,
        // Missing timestamp property
      };
      mockStorageWrapper.getItem.mockResolvedValue(
        JSON.stringify(invalidCachedData),
      );

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorageWrapper.removeItem).toHaveBeenCalled();
    });

    it('handles cache with missing chainId property', async () => {
      // Arrange
      const invalidCachedData = {
        tokens: mockBridgeTokens,
        timestamp: Date.now(),
        // Missing chainId property
      };
      mockStorageWrapper.getItem.mockResolvedValue(
        JSON.stringify(invalidCachedData),
      );

      // Act
      const result = await cacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorageWrapper.removeItem).toHaveBeenCalled();
    });
  });

  describe('constructor configuration', () => {
    it('uses default configuration when no config provided', () => {
      // Act
      const defaultCacheManager = new BridgeTokensCacheManager();

      // Assert - test by triggering a cache operation and checking the key format
      expect(defaultCacheManager).toBeInstanceOf(BridgeTokensCacheManager);
    });

    it('uses custom TTL configuration', async () => {
      // Arrange
      const customTtl = 10 * 60 * 1000; // 10 minutes
      const customCacheManager = new BridgeTokensCacheManager({
        ttlMs: customTtl,
      });

      const cacheTimestamp = Date.now() - customTtl - 1000; // 1 second past custom TTL
      const cachedData = {
        tokens: mockBridgeTokens,
        timestamp: cacheTimestamp,
        chainId: mockChainId,
      };
      mockStorageWrapper.getItem.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await customCacheManager.getCachedTokens(mockChainId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorageWrapper.removeItem).toHaveBeenCalled();
    });
  });
});
