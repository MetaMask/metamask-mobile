import { MetaMaskDAOService, METAMASK_DAO_CONFIG } from './MetaMaskDAOService';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../util/notifications/methods/common');
jest.mock('ethers');

describe('MetaMaskDAOService', () => {
  let service: MetaMaskDAOService;
  let mockProvider: any;
  let mockContract: any;

  beforeEach(() => {
    service = new MetaMaskDAOService();
    
    mockContract = {
      filters: {
        Transfer: jest.fn(() => 'transfer-filter'),
      },
      queryFilter: jest.fn(),
    };

    mockProvider = {
      getNetwork: jest.fn(() => Promise.resolve({ chainId: 1 })),
    };

    (getProviderByChainId as jest.Mock).mockReturnValue(mockProvider);
    
    // Mock ethers Contract constructor
    const { Contract } = require('ethers');
    Contract.mockImplementation(() => mockContract);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearCache();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid provider', async () => {
      await service.initialize();
      
      expect(getProviderByChainId).toHaveBeenCalledWith(METAMASK_DAO_CONFIG.CHAIN_ID);
      expect(DevLogger.log).toHaveBeenCalledWith('MetaMaskDAOService: Service initialized successfully');
    });

    it('should throw error when provider is not available', async () => {
      (getProviderByChainId as jest.Mock).mockReturnValue(null);

      await expect(service.initialize()).rejects.toThrow('Unable to get Web3 provider for Ethereum mainnet');
    });

    it('should not re-initialize if already initialized', async () => {
      await service.initialize();
      jest.clearAllMocks();
      
      await service.initialize();
      
      expect(getProviderByChainId).not.toHaveBeenCalled();
    });
  });

  describe('isTokenHolder', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return false for empty address', async () => {
      const result = await service.isTokenHolder('');
      expect(result).toBe(false);
    });

    it('should return true for valid token holder', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      const mockEvents = [
        {
          args: ['0x0000000000000000000000000000000000000000', testAddress.toLowerCase()],
        },
      ];

      mockContract.queryFilter.mockResolvedValue(mockEvents);

      const result = await service.isTokenHolder(testAddress);
      
      expect(result).toBe(true);
      expect(mockContract.queryFilter).toHaveBeenCalledWith(
        'transfer-filter',
        METAMASK_DAO_CONFIG.DEPLOY_BLOCK,
      );
    });

    it('should return false for non-token holder', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      const mockEvents: any[] = []; // No transfer events

      mockContract.queryFilter.mockResolvedValue(mockEvents);

      const result = await service.isTokenHolder(testAddress);
      
      expect(result).toBe(false);
    });

    it('should handle token transfers correctly (burn scenario)', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      const mockEvents = [
        // User receives tokens
        {
          args: ['0x0000000000000000000000000000000000000000', testAddress.toLowerCase()],
        },
        // User burns/transfers tokens away
        {
          args: [testAddress.toLowerCase(), '0x0000000000000000000000000000000000000000'],
        },
      ];

      mockContract.queryFilter.mockResolvedValue(mockEvents);

      const result = await service.isTokenHolder(testAddress);
      
      expect(result).toBe(false);
    });

    it('should use cached result when available', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      const mockEvents = [
        {
          args: ['0x0000000000000000000000000000000000000000', testAddress.toLowerCase()],
        },
      ];

      mockContract.queryFilter.mockResolvedValue(mockEvents);

      // First call
      const result1 = await service.isTokenHolder(testAddress);
      expect(result1).toBe(true);
      expect(mockContract.queryFilter).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await service.isTokenHolder(testAddress);
      expect(result2).toBe(true);
      expect(mockContract.queryFilter).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should return false on error and log the error', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      const mockError = new Error('Network error');
      
      mockContract.queryFilter.mockRejectedValue(mockError);

      const result = await service.isTokenHolder(testAddress);
      
      expect(result).toBe(false);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'MetaMaskDAOService: Error checking token holder status',
        {
          error: 'Network error',
          address: testAddress,
        },
      );
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      service.clearCache();
      
      expect(DevLogger.log).toHaveBeenCalledWith('MetaMaskDAOService: Cache cleared');
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats when no cache', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toEqual({
        isCached: false,
        holdersCount: 0,
        cacheAge: 0,
        cacheExpiry: null,
      });
    });

    it('should return cache stats when cache exists', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      const mockEvents = [
        {
          args: ['0x0000000000000000000000000000000000000000', testAddress.toLowerCase()],
        },
      ];

      await service.initialize();
      mockContract.queryFilter.mockResolvedValue(mockEvents);
      
      await service.isTokenHolder(testAddress);
      
      const stats = service.getCacheStats();
      
      expect(stats.isCached).toBe(true);
      expect(stats.holdersCount).toBe(1);
      expect(stats.cacheAge).toBeGreaterThanOrEqual(0);
      expect(stats.cacheExpiry).toBeTruthy();
    });
  });
});