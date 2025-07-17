import { SafeChain } from '../components/UI/NetworkModal';
import StorageWrapper from '../store/storage-wrapper';
import Engine from '../core/Engine';
import {
  getSafeChainsListFromCacheOnly,
  initializeRpcProviderDomains,
  getKnownDomains,
  isKnownDomain,
  extractRpcDomain,
  getNetworkRpcUrl,
  getModuleState,
} from './rpc-domain-utils';

// Mock dependencies
jest.mock('../store/storage-wrapper');
jest.mock('../core/Engine');
jest.mock('./Logger');

// Define types for NetworkController mock
interface NetworkConfiguration {
  rpcUrl?: string;
  rpcEndpoints?: { url: string }[];
  defaultRpcEndpointIndex?: number;
}

interface MockNetworkController {
  findNetworkClientIdByChainId: jest.Mock<string | null, [`0x${string}`]>;
  getNetworkConfigurationByNetworkClientId: jest.Mock<
    NetworkConfiguration | null,
    [string]
  >;
}

function setupTestEnvironment() {
  jest.clearAllMocks();
  // Reset module state using the getter/setter approach
  const state = getModuleState();
  state.setKnownDomainsSet(null);
  state.setInitPromise(null);
  return {
    mockNetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    } as MockNetworkController,
  };
}

describe('rpc-domain-utils', () => {
  describe('getSafeChainsListFromCacheOnly', () => {
    describe('when cache contains valid chains data', () => {
      it('returns the cached chains data', async () => {
        // Setup
        const mockChains: SafeChain[] = [
          {
            chainId: '1',
            name: 'Ethereum',
            nativeCurrency: { symbol: 'ETH' },
            rpc: ['https://mainnet.infura.io'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        // Exercise
        const result = await getSafeChainsListFromCacheOnly();
        // Verify
        expect(result).toEqual(mockChains);
      });
    });
    describe('when cache is empty', () => {
      it('returns an empty array', async () => {
        // Setup
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
        // Exercise
        const result = await getSafeChainsListFromCacheOnly();
        // Verify
        expect(result).toEqual([]);
      });
    });
    describe('when cache contains invalid data', () => {
      it('returns an empty array', async () => {
        // Setup
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue('invalid json');
        // Exercise
        const result = await getSafeChainsListFromCacheOnly();
        // Verify
        expect(result).toEqual([]);
      });
    });
    it('does not raise error and returns an empty array', async () => {
      // Mock StorageWrapper to return invalid JSON
      (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(
        'invalid-json',
      );
      await expect(getSafeChainsListFromCacheOnly()).resolves.not.toThrow();
      const result = await getSafeChainsListFromCacheOnly();
      expect(result).toEqual([]);
    });
  });
  describe('initializeRpcProviderDomains', () => {
    describe('when chains list contains valid RPC URLs', () => {
      it('initializes known domains from the chains list', async () => {
        // Setup
        setupTestEnvironment(); // Reset state
        const mockChains: SafeChain[] = [
          {
            chainId: '1',
            name: 'Ethereum',
            nativeCurrency: { symbol: 'ETH' },
            rpc: [
              'https://mainnet.infura.io',
              'https://eth-mainnet.alchemyapi.io',
            ],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        // Exercise
        await initializeRpcProviderDomains();
        // Verify
        const knownDomains = getKnownDomains();
        expect(knownDomains).toBeInstanceOf(Set);
        expect(knownDomains?.has('mainnet.infura.io')).toBe(true);
        expect(knownDomains?.has('eth-mainnet.alchemyapi.io')).toBe(true);
      });
    });
    describe('when chains list contains invalid RPC URLs', () => {
      it('does not add invalid URLs from knownDomains', async () => {
        // Setup
        setupTestEnvironment(); // Reset state
        const mockChains: SafeChain[] = [
          {
            chainId: '1',
            name: 'Ethereum',
            nativeCurrency: { symbol: 'ETH' },
            rpc: ['invalid-url', 'https://mainnet.infura.io'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        // Exercise
        await initializeRpcProviderDomains();
        //verify
        const knownDomains = getKnownDomains();
        expect(knownDomains).toBeInstanceOf(Set);
        expect(knownDomains?.has('mainnet.infura.io')).toBe(true);
        expect(knownDomains?.size).toBe(1);
      });
    });
    describe('when chains list is empty', () => {
      it('initializes with an empty set of domains', async () => {
        // Setup
        setupTestEnvironment(); // Reset state
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify([]),
        );
        // Exercise
        await initializeRpcProviderDomains();
        // Verify
        const knownDomains = getKnownDomains();
        expect(knownDomains).toBeInstanceOf(Set);
        expect(knownDomains?.size).toBe(0);
      });
    });
    it('initializes with empty set on error', async () => {
      // Mock getSafeChainsListFromCacheOnly to throw
      const spy = jest
        .spyOn(
          { getSafeChainsListFromCacheOnly },
          'getSafeChainsListFromCacheOnly',
        )
        .mockRejectedValueOnce(new Error('Test error'));
      await initializeRpcProviderDomains();
      expect(getKnownDomains()).toEqual(new Set());
      spy.mockRestore();
    });
  });
  describe('isKnownDomain', () => {
    describe('when checking domain existence', () => {
      beforeEach(async () => {
        setupTestEnvironment();
        const mockChains: SafeChain[] = [
          {
            chainId: '1',
            name: 'Test Chain',
            nativeCurrency: { symbol: 'TEST' },
            rpc: ['https://known-domain.com/api'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        await initializeRpcProviderDomains();
      });
      it('returns true for known domains', () => {
        // Execute
        const result = isKnownDomain('known-domain.com');
        // Verify
        expect(result).toBe(true);
      });
      it('returns false for unknown domains', () => {
        // Execute
        const result = isKnownDomain('unknown-domain.com');
        // Verify
        expect(result).toBe(false);
      });
      it('returns false for null knownDomainsSet', async () => {
        // Setup
        setupTestEnvironment();
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
        await initializeRpcProviderDomains();
        // Execute
        const result = isKnownDomain('any-domain.com');
        // Verify
        expect(result).toBe(false);
      });
      it('matches domain ignoring case', async () => {
        // Setup
        setupTestEnvironment();
        const mockChains: SafeChain[] = [
          {
            chainId: '1',
            name: 'Test Chain',
            nativeCurrency: { symbol: 'TEST' },
            rpc: ['https://Known-Domain.com/api'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        await initializeRpcProviderDomains();
        // Execute
        const result1 = isKnownDomain('known-domain.com');
        const result2 = isKnownDomain('KNOWN-DOMAIN.COM');
        // Verify
        expect(result1).toBe(true);
        expect(result2).toBe(true);
      });
    });
  });
  describe('extractRpcDomain', () => {
    describe('when processing URLs', () => {
      beforeEach(async () => {
        setupTestEnvironment();
        const mockChains: SafeChain[] = [
          {
            chainId: '1',
            name: 'Test Chain',
            nativeCurrency: { symbol: 'TEST' },
            rpc: ['https://known-domain.com/api'],
          },
        ];
        (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockChains),
        );
        await initializeRpcProviderDomains();
      });
      it('returns domain for known domains', () => {
        // Execute
        const result = extractRpcDomain('https://known-domain.com/api');
        // Verify
        expect(result).toBe('known-domain.com');
      });
      it('returns Invalid for invalid URLs', () => {
        // Execute
        const result = extractRpcDomain(':::invalid-url');
        // Verify
        expect(result).toBe('invalid');
      });
      it('returns Private for unknown domains', () => {
        // Execute
        const result = extractRpcDomain('https://unknown-domain.com');
        // Verify
        expect(result).toBe('private');
      });
      it('returns actual domain for Infura URLs', () => {
        // Execute
        const result = extractRpcDomain('https://mainnet.infura.io');
        // Verify
        expect(result).toBe('mainnet.infura.io');
      });
      it('returns actual domain for Alchemy URLs', () => {
        // Execute
        const result = extractRpcDomain('https://eth-mainnet.alchemyapi.io');
        // Verify
        expect(result).toBe('eth-mainnet.alchemyapi.io');
      });
      it('returns Private for localhost', () => {
        // Execute
        const result1 = extractRpcDomain('http://localhost:8545');
        const result2 = extractRpcDomain('http://127.0.0.1:8545');

        // Verify
        expect(result1).toBe('private');
        expect(result2).toBe('private');
      });
      it('returns the domain for URLs without protocol', () => {
        // Execute
        const result = extractRpcDomain('known-domain.com/api');
        // Verify
        expect(result).toBe('known-domain.com');
      });
    });
  });
  describe('getNetworkRpcUrl', () => {
    describe('when retrieving RPC URLs', () => {
      it('returns RPC URL from legacy format', () => {
        // Setup
        const { mockNetworkController } = setupTestEnvironment();
        mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
          'network1',
        );
        mockNetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
          {
            rpcUrl: 'https://legacy-rpc.com',
          },
        );
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController = mockNetworkController;
        // Exercise
        const result = getNetworkRpcUrl('0x1');
        // Verify
        expect(result).toBe('https://legacy-rpc.com');
      });
      it('returns RPC URL from rpcEndpoints array', () => {
        // Setup
        const { mockNetworkController } = setupTestEnvironment();
        mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
          'network1',
        );
        mockNetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
          {
            rpcEndpoints: [
              { url: 'https://rpc1.com' },
              { url: 'https://rpc2.com' },
            ],
            defaultRpcEndpointIndex: 1,
          },
        );
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController = mockNetworkController;
        // Exercise
        const result = getNetworkRpcUrl('0x1');
        // Verify
        expect(result).toBe('https://rpc2.com');
      });
      it('returns unknown when network client ID not found', () => {
        // Setup
        const { mockNetworkController } = setupTestEnvironment();
        mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
          null,
        );
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController = mockNetworkController;
        // Exercise
        const result = getNetworkRpcUrl('0x1');
        // Verify
        expect(result).toBe('unknown');
      });
      it('returns unknown when network configuration not found', () => {
        // Setup
        const { mockNetworkController } = setupTestEnvironment();
        mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
          'network1',
        );
        mockNetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
          null,
        );
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController = mockNetworkController;
        // Exercise
        const result = getNetworkRpcUrl('0x1');
        // Verify
        expect(result).toBe('unknown');
      });
      it('returns unknown as RPC URL on error', () => {
        // Setup
        const { mockNetworkController } = setupTestEnvironment();
        mockNetworkController.findNetworkClientIdByChainId.mockImplementation(
          () => {
            throw new Error('Test error');
          },
        );
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController = mockNetworkController;
        // Exercise
        const result = getNetworkRpcUrl('0x1');
        // Verify
        expect(result).toBe('unknown');
      });
      it('returns unknown as RPC URL on missing rpcEndpoints', () => {
        const mockNetworkConfig = {
          rpcEndpoints: undefined,
        };
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValueOnce(
          mockNetworkConfig,
        );
        const result = getNetworkRpcUrl('0x1');
        expect(result).toBe('unknown');
      });
      it('handles invalid rpcEndpoints array', () => {
        const mockNetworkConfig = {
          rpcEndpoints: [{ url: '' }], // Empty url property
        };
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValueOnce(
          mockNetworkConfig,
        );
        const result = getNetworkRpcUrl('0x1');
        expect(result).toBe('unknown');
      });
      it('returns unknown as RPC URL on empty rpcEndpoints array', () => {
        const mockNetworkConfig = {
          rpcEndpoints: [], // Empty array
        };
        (
          Engine.context as unknown as {
            NetworkController: MockNetworkController;
          }
        ).NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValueOnce(
          mockNetworkConfig,
        );
        const result = getNetworkRpcUrl('0x1');
        expect(result).toBe('unknown');
      });
    });
  });
});
