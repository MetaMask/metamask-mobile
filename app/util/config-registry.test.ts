import {
  getDefaultConfigRegistryControllerState,
  registryConfigToPopularListShape,
  getNetworksToAddFromFeatured,
  addNetworkFieldsToPopularListShape,
  type PopularListNetworkShape,
} from './config-registry';

describe('config-registry util', () => {
  describe('getDefaultConfigRegistryControllerState', () => {
    it('returns default state with empty networks', () => {
      const state = getDefaultConfigRegistryControllerState();
      expect(state.configs).toEqual({ networks: {} });
      expect(state.version).toBeNull();
      expect(state.lastFetched).toBeNull();
      expect(state.etag).toBeNull();
    });
  });

  describe('registryConfigToPopularListShape', () => {
    it('returns null for non-EVM chain', () => {
      const config = {
        chainId: 'solana:5eykt4',
        name: 'Solana',
        rpcProviders: {
          default: { url: 'https://api.mainnet-beta.solana.com' },
          fallbacks: [],
        },
        config: { isFeatured: true },
      } as never;
      expect(registryConfigToPopularListShape(config)).toBeNull();
    });

    it('returns null when default RPC url is missing', () => {
      const config = {
        chainId: 'eip155:1',
        name: 'Ethereum',
        rpcProviders: { default: { url: '' }, fallbacks: [] },
        config: { isFeatured: true },
      } as never;
      expect(registryConfigToPopularListShape(config)).toBeNull();
    });

    it('returns PopularListNetworkShape for valid EVM config', () => {
      const config = {
        chainId: 'eip155:1329',
        name: 'Sei Network',
        rpcProviders: {
          default: {
            url: 'https://evm-rpc.sei.network',
            type: 'custom',
            networkClientId: 'evm-sei-1329',
          },
          fallbacks: [],
        },
        blockExplorerUrls: { default: 'https://seitrace.com', fallbacks: [] },
        assets: {
          native: { symbol: 'SEI', decimals: 18 },
        },
        config: { isFeatured: true },
      } as never;
      const result = registryConfigToPopularListShape(config);
      expect(result).not.toBeNull();
      expect((result as PopularListNetworkShape).chainId).toBe('0x531');
      expect((result as PopularListNetworkShape).nickname).toBe('Sei Network');
      expect((result as PopularListNetworkShape).rpcUrl).toBe(
        'https://evm-rpc.sei.network',
      );
      expect((result as PopularListNetworkShape).ticker).toBe('SEI');
    });

    it('uses default blockExplorerUrl and ticker when missing', () => {
      const config = {
        chainId: 'eip155:999',
        name: 'Custom',
        rpcProviders: {
          default: { url: 'https://rpc.example.com', fallbacks: [] },
        },
      } as never;
      const result = registryConfigToPopularListShape(config);
      expect(result).not.toBeNull();
      expect(
        (result as PopularListNetworkShape).rpcPrefs.blockExplorerUrl,
      ).toBe('');
      expect((result as PopularListNetworkShape).ticker).toBe('ETH');
    });

    it('includes imageUrl when provided', () => {
      const config = {
        chainId: 'eip155:1',
        name: 'Ethereum',
        rpcProviders: {
          default: { url: 'https://eth.llamarpc.com', fallbacks: [] },
        },
        imageUrl: 'https://example.com/eth.svg',
      } as never;
      const result = registryConfigToPopularListShape(config);
      expect(result).not.toBeNull();
      expect((result as PopularListNetworkShape).rpcPrefs.imageUrl).toBe(
        'https://example.com/eth.svg',
      );
    });
  });

  describe('getNetworksToAddFromFeatured', () => {
    it('filters out networks already in configurations', () => {
      const featured = [
        {
          chainId: 'eip155:1',
          name: 'Ethereum',
          rpcProviders: {
            default: { url: 'https://eth.llamarpc.com' },
            fallbacks: [],
          },
          config: {},
        },
        {
          chainId: 'eip155:137',
          name: 'Polygon',
          rpcProviders: {
            default: { url: 'https://polygon.llamarpc.com' },
            fallbacks: [],
          },
          config: {},
        },
      ] as never[];
      const existing = { '0x1': {} };
      const result = getNetworksToAddFromFeatured(featured, existing);
      expect(result.length).toBe(1);
      expect(result[0].chainId).toBe('eip155:137');
    });
  });

  describe('addNetworkFieldsToPopularListShape', () => {
    it('throws for non-EVM config', () => {
      const config = {
        chainId: 'solana:5eykt4',
        name: 'Solana',
        rpcProviders: {
          default: { url: 'https://api.mainnet-beta.solana.com' },
          fallbacks: [],
        },
      } as never;
      expect(() => addNetworkFieldsToPopularListShape(config)).toThrow();
    });

    it('returns shape for valid EVM config', () => {
      const config = {
        chainId: 'eip155:1',
        name: 'Ethereum Mainnet',
        rpcProviders: {
          default: { url: 'https://eth.llamarpc.com' },
          fallbacks: [],
        },
        blockExplorerUrls: { default: 'https://etherscan.io', fallbacks: [] },
        assets: { native: { symbol: 'ETH', decimals: 18 } },
        config: {},
      } as never;
      const result = addNetworkFieldsToPopularListShape(config);
      expect(result.chainId).toBe('0x1');
      expect(result.nickname).toBe('Ethereum Mainnet');
      expect(result.rpcUrl).toBe('https://eth.llamarpc.com');
      expect(result.ticker).toBe('ETH');
    });
  });
});
