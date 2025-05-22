import { SafeChain } from '../components/UI/NetworkModal';
import StorageWrapper from '../store/storage-wrapper';
import Engine from '../core/Engine';
import {
  getSafeChainsListFromCacheOnly,
  initializeRpcProviderDomains,
  getKnownDomains,
  setKnownDomains,
  isKnownDomain,
  RpcDomainStatus,
  extractRpcDomain,
  getNetworkRpcUrl,
  resetModuleState,
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
  getNetworkConfigurationByNetworkClientId: jest.Mock<NetworkConfiguration | null, [string]>;
}

describe('rpc-domain-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetModuleState();
  });

  describe('getSafeChainsListFromCacheOnly', () => {
    it('should return cached chains data when available', async () => {
      const mockChains: SafeChain[] = [
        {
          chainId: '1',
          name: 'Ethereum',
          nativeCurrency: { symbol: 'ETH' },
          rpc: ['https://mainnet.infura.io'],
        },
      ];
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockChains));

      const result = await getSafeChainsListFromCacheOnly();
      expect(result).toEqual(mockChains);
    });

    it('should return empty array when cache is empty', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getSafeChainsListFromCacheOnly();
      expect(result).toEqual([]);
    });

    it('should return empty array when cache parsing fails', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await getSafeChainsListFromCacheOnly();
      expect(result).toEqual([]);
    });
  });

  describe('initializeRpcProviderDomains', () => {
    it('should initialize known domains from chains list', async () => {
      const mockChains: SafeChain[] = [
        {
          chainId: '1',
          name: 'Ethereum',
          nativeCurrency: { symbol: 'ETH' },
          rpc: ['https://mainnet.infura.io', 'https://eth-mainnet.alchemyapi.io'],
        },
      ];
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockChains));

      await initializeRpcProviderDomains();
      const knownDomains = getKnownDomains();
      expect(knownDomains).toBeInstanceOf(Set);
      expect(knownDomains?.has('mainnet.infura.io')).toBe(true);
      expect(knownDomains?.has('eth-mainnet.alchemyapi.io')).toBe(true);
    });

    it('should handle invalid RPC URLs gracefully', async () => {
      const mockChains: SafeChain[] = [
        {
          chainId: '1',
          name: 'Ethereum',
          nativeCurrency: { symbol: 'ETH' },
          rpc: ['invalid-url', 'https://mainnet.infura.io'],
        },
      ];
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockChains));

      await initializeRpcProviderDomains();
      const knownDomains = getKnownDomains();
      expect(knownDomains).toBeInstanceOf(Set);
      expect(knownDomains?.has('mainnet.infura.io')).toBe(true);
      expect(knownDomains?.size).toBe(1);
    });

    it('should handle empty chains list', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));

      await initializeRpcProviderDomains();
      const knownDomains = getKnownDomains();
      expect(knownDomains).toBeInstanceOf(Set);
      expect(knownDomains?.size).toBe(0);
    });
  });

  describe('getKnownDomains and setKnownDomains', () => {
    it('should get and set known domains correctly', () => {
      const testDomains = new Set(['test.com']);
      setKnownDomains(testDomains);
      expect(getKnownDomains()).toBe(testDomains);
    });

    it('should handle null domains', () => {
      setKnownDomains(null);
      expect(getKnownDomains()).toBeNull();
    });
  });

  describe('isKnownDomain', () => {
    it('should return true for known domains', () => {
      const testDomains = new Set(['test.com']);
      setKnownDomains(testDomains);
      expect(isKnownDomain('test.com')).toBe(true);
    });

    it('should return false for unknown domains', () => {
      const testDomains = new Set(['test.com']);
      setKnownDomains(testDomains);
      expect(isKnownDomain('unknown.com')).toBe(false);
    });

    it('should handle null knownDomainsSet', () => {
      setKnownDomains(null);
      expect(isKnownDomain('test.com')).toBe(false);
    });

    it('should handle case-insensitive domain matching', () => {
      const testDomains = new Set(['test.com']);
      setKnownDomains(testDomains);
      expect(isKnownDomain('test.com')).toBe(true);
      expect(isKnownDomain('TEST.COM')).toBe(true);
    });
  });

  describe('extractRpcDomain', () => {
    beforeEach(() => {
      const testDomains = new Set(['known-domain.com']);
      setKnownDomains(testDomains);
    });

    it('should return domain for known domains', () => {
      expect(extractRpcDomain('https://known-domain.com')).toBe('known-domain.com');
    });

    it('should return Invalid for invalid URLs', () => {
      expect(extractRpcDomain(':::invalid-url')).toBe(RpcDomainStatus.Invalid);
    });

    it('should return Private for unknown domains', () => {
      expect(extractRpcDomain('https://unknown-domain.com')).toBe(RpcDomainStatus.Private);
    });

    it('should return actual domain for Infura URLs', () => {
      expect(extractRpcDomain('https://mainnet.infura.io')).toBe('mainnet.infura.io');
    });

    it('should return actual domain for Alchemy URLs', () => {
      expect(extractRpcDomain('https://eth-mainnet.alchemyapi.io')).toBe('eth-mainnet.alchemyapi.io');
    });

    it('should return Private for localhost', () => {
      expect(extractRpcDomain('http://localhost:8545')).toBe(RpcDomainStatus.Private);
      expect(extractRpcDomain('http://127.0.0.1:8545')).toBe(RpcDomainStatus.Private);
    });

    it('should handle URLs without protocol', () => {
      expect(extractRpcDomain('known-domain.com')).toBe('known-domain.com');
    });
  });

  describe('getNetworkRpcUrl', () => {
    let mockNetworkController: MockNetworkController;

    beforeEach(() => {
      mockNetworkController = {
        findNetworkClientIdByChainId: jest.fn(),
        getNetworkConfigurationByNetworkClientId: jest.fn(),
      };
      (Engine.context as unknown as { NetworkController: MockNetworkController }).NetworkController = mockNetworkController;
    });

    it('should return RPC URL from legacy format', () => {
      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue('network1');
      mockNetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue({
        rpcUrl: 'https://legacy-rpc.com',
      });

      expect(getNetworkRpcUrl('0x1')).toBe('https://legacy-rpc.com');
    });

    it('should return RPC URL from rpcEndpoints array', () => {
      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue('network1');
      mockNetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue({
        rpcEndpoints: [
          { url: 'https://rpc1.com' },
          { url: 'https://rpc2.com' },
        ],
        defaultRpcEndpointIndex: 1,
      });

      expect(getNetworkRpcUrl('0x1')).toBe('https://rpc2.com');
    });

    it('should return unknown when network client ID not found', () => {
      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(null);

      expect(getNetworkRpcUrl('0x1')).toBe('unknown');
    });

    it('should return unknown when network configuration not found', () => {
      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue('network1');
      mockNetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(null);

      expect(getNetworkRpcUrl('0x1')).toBe('unknown');
    });

    it('should handle errors gracefully', () => {
      mockNetworkController.findNetworkClientIdByChainId.mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(getNetworkRpcUrl('0x1')).toBe('unknown');
    });
  });
});
