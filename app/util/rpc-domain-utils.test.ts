import { extractRpcDomain, isKnownDomain, setKnownDomainsForTesting, getNetworkRpcUrl, RpcDomainStatus } from './rpc-domain-utils';
import { generateRPCProperties } from '../core/Engine/controllers/transaction-controller/utils';
  // eslint-disable-next-line import/no-namespace
import * as rpcUtils from './rpc-domain-utils';

jest.mock('../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(),
        getNetworkConfigurationByNetworkClientId: jest.fn(),
      },
    },
  },
}));

import Engine from '../core/Engine';

describe('rpc-domain-utils', () => {
  describe('extractRpcDomain', () => {
    beforeEach(() => {
      // Set up known domains for testing
      setKnownDomainsForTesting(new Set(['example.com', 'infura.io', 'eth-mainnet.alchemyapi.io']));
    });

    afterEach(() => {
      // Clear test domains
      setKnownDomainsForTesting(null);
    });

    it('should extract domain from valid URLs', () => {
      expect(extractRpcDomain('https://example.com')).toBe('example.com');
      expect(extractRpcDomain('https://infura.io/v3/123')).toBe('infura.io');
      expect(extractRpcDomain('http://localhost:8545')).toBe(RpcDomainStatus.Private);
      expect(extractRpcDomain('wss://eth-mainnet.alchemyapi.io/v2/key')).toBe('eth-mainnet.alchemyapi.io');
    });

    it('returns "private" for unknown domains', () => {
      expect(extractRpcDomain('https://custom-rpc.org')).toBe('private');
      expect(extractRpcDomain('https://my-private-node.com')).toBe('private');
    });

    it('returns "private" for URLs without protocol', () => {
      expect(extractRpcDomain('infura.io/v3/123')).toBe('infura.io');
      expect(extractRpcDomain('localhost:8545')).toBe(RpcDomainStatus.Private);
    });

    it('should return "invalid" for unparseable URLs', () => {
      expect(extractRpcDomain('')).toBe(RpcDomainStatus.Invalid);
      expect(extractRpcDomain(null as unknown as string)).toBe(RpcDomainStatus.Invalid);
      expect(extractRpcDomain(undefined as unknown as string)).toBe(RpcDomainStatus.Invalid);
      expect(extractRpcDomain(':::invalid-url')).toBe(RpcDomainStatus.Invalid);
    });
  });

  describe('isKnownDomain', () => {
    beforeEach(() => {
      setKnownDomainsForTesting(new Set(['example.com', 'infura.io']));
    });

    afterEach(() => {
      setKnownDomainsForTesting(null);
    });

    it('should return true for known domains', () => {
      expect(isKnownDomain('example.com')).toBe(true);
      expect(isKnownDomain('infura.io')).toBe(true);
    });

    it('should return false for unknown domains', () => {
      expect(isKnownDomain('unknown.com')).toBe(false);
      expect(isKnownDomain('custom.net')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isKnownDomain('EXAMPLE.COM')).toBe(true);
      expect(isKnownDomain('Infura.Io')).toBe(true);
    });
  });

  describe('getNetworkRpcUrl', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return the RPC URL when network client and configuration are found', () => {
      // Mock implementation
      const mockNetworkClientId = 'mock-network-client-id';
      (Engine.context.NetworkController.findNetworkClientIdByChainId as jest.Mock).mockReturnValue(mockNetworkClientId);
      (Engine.context.NetworkController.getNetworkConfigurationByNetworkClientId as jest.Mock).mockReturnValue({
        rpcEndpoints: [
          { url: 'https://mainnet.infura.io/v3/123' },
          { url: 'https://backup.example.com' },
        ],
        defaultRpcEndpointIndex: 0,
      });

      const result = getNetworkRpcUrl('0x1');

      // Verify correct RPC URL is returned
      expect(result).toBe('https://mainnet.infura.io/v3/123');
      expect(Engine.context.NetworkController.findNetworkClientIdByChainId).toHaveBeenCalledWith('0x1');
      expect(Engine.context.NetworkController.getNetworkConfigurationByNetworkClientId).toHaveBeenCalledWith(mockNetworkClientId);
    });

    it('should handle legacy configuration with direct rpcUrl property', () => {
      // Mock implementation for legacy format
      const mockNetworkClientId = 'mock-network-client-id';
      (Engine.context.NetworkController.findNetworkClientIdByChainId as jest.Mock).mockReturnValue(mockNetworkClientId);
      (Engine.context.NetworkController.getNetworkConfigurationByNetworkClientId as jest.Mock).mockReturnValue({
        rpcUrl: 'https://legacy.example.com',
      });

      const result = getNetworkRpcUrl('0x1');

      // Verify correct RPC URL is returned
      expect(result).toBe('https://legacy.example.com');
    });

    it('returns "unknown" when network client ID is not found', () => {
      // Mock implementation for missing network client
      (Engine.context.NetworkController.findNetworkClientIdByChainId as jest.Mock).mockReturnValue(null);

      const result = getNetworkRpcUrl('0x999');

      // Verify "unknown" is returned
      expect(result).toBe('unknown');
      expect(Engine.context.NetworkController.getNetworkConfigurationByNetworkClientId).not.toHaveBeenCalled();
    });
  });

  describe('generateRPCProperties', () => {
    it('returns { properties: { rpc_domain: "example.com" }, sensitiveProperties: {} } for a known domain', () => {
      jest.spyOn(rpcUtils, 'getNetworkRpcUrl').mockReturnValue('https://example.com');
      jest.spyOn(rpcUtils, 'extractRpcDomain').mockReturnValue('example.com');
      expect(generateRPCProperties('0x1')).toEqual({
        properties: { rpc_domain: 'example.com' },
        sensitiveProperties: {},
      });
    });

    it('returns { properties: { rpc_domain: "invalid" }, sensitiveProperties: {} } for an invalid domain', () => {
      jest.spyOn(rpcUtils, 'getNetworkRpcUrl').mockReturnValue('invalid-url');
      jest.spyOn(rpcUtils, 'extractRpcDomain').mockReturnValue(RpcDomainStatus.Invalid);
      expect(generateRPCProperties('0x2')).toEqual({
        properties: { rpc_domain: RpcDomainStatus.Invalid },
        sensitiveProperties: {},
      });
    });

    it('returns { properties: { rpc_domain: "private" }, sensitiveProperties: {} } for a private domain', () => {
      jest.spyOn(rpcUtils, 'getNetworkRpcUrl').mockReturnValue('http://localhost:8545');
      jest.spyOn(rpcUtils, 'extractRpcDomain').mockReturnValue(RpcDomainStatus.Private);
      expect(generateRPCProperties('0x3')).toEqual({
        properties: { rpc_domain: RpcDomainStatus.Private },
        sensitiveProperties: {},
      });
    });
  });
});
