import type { RegistryNetworkConfig } from '@metamask/config-registry-controller';
import type { StateWithPartialEngine } from './featureFlagController/types';
import {
  getConfigRegistryState,
  getConfigRegistryNetworks,
  isConfigRegistryNetworksLoading,
  getIsConfigRegistryApiEnabled,
  getAdditionalNetworksList,
  getRegistryNetworkImagesByChainId,
  CONFIG_REGISTRY_API_ENABLED_FLAG_KEY,
} from './configRegistry';

describe('configRegistry selectors', () => {
  describe('getConfigRegistryState', () => {
    it('returns ConfigRegistryController state from engine.backgroundState', () => {
      const state = {
        engine: {
          backgroundState: {
            ConfigRegistryController: {
              configs: { networks: { 'eip155:1': {} } },
              version: '1.0',
              lastFetched: 123,
              etag: null,
            },
          },
        },
      };
      expect(getConfigRegistryState(state as never)).toEqual(
        state.engine.backgroundState.ConfigRegistryController,
      );
    });

    it('returns default state when ConfigRegistryController is missing', () => {
      const state = { engine: { backgroundState: {} } };
      const result = getConfigRegistryState(state as never);
      expect(result.configs).toEqual({ networks: {}, eventsConfig: null });
      expect(result.version).toBeNull();
      expect(result.lastFetched).toBeNull();
      expect(result.etag).toBeNull();
      expect(result.eventsConfigEtag).toBeNull();
    });
  });

  describe('getConfigRegistryNetworks', () => {
    it('returns empty array when configs.networks is empty', () => {
      const state = {
        engine: {
          backgroundState: {
            ConfigRegistryController: {
              configs: { networks: {} },
              version: null,
              lastFetched: null,
              etag: null,
            },
          },
        },
      };
      expect(getConfigRegistryNetworks(state as never)).toEqual([]);
    });

    it('returns networks when configs.networks has entries', () => {
      const networks = {
        'eip155:1': {
          chainId: 'eip155:1',
          name: 'Ethereum',
          rpcProviders: {
            default: { url: 'https://eth.llamarpc.com' },
            fallbacks: [],
          },
        },
      };
      const state = {
        engine: {
          backgroundState: {
            ConfigRegistryController: {
              configs: { networks },
              version: '1',
              lastFetched: 1,
              etag: null,
            },
          },
        },
      };
      expect(getConfigRegistryNetworks(state as never)).toEqual([
        networks['eip155:1'],
      ]);
    });
  });

  describe('isConfigRegistryNetworksLoading', () => {
    it('returns false when lastFetched is set and no networks', () => {
      const state = {
        engine: {
          backgroundState: {
            ConfigRegistryController: {
              configs: { networks: {} },
              version: null,
              lastFetched: Date.now(),
              etag: null,
            },
          },
        },
      };
      expect(isConfigRegistryNetworksLoading(state as never)).toBe(false);
    });

    it('returns true when not yet fetched and no networks', () => {
      const state = {
        engine: {
          backgroundState: {
            ConfigRegistryController: {
              configs: { networks: {} },
              version: null,
              lastFetched: null,
              etag: null,
            },
          },
        },
      };
      expect(isConfigRegistryNetworksLoading(state as never)).toBe(true);
    });

    it('returns false when configs exist', () => {
      const state = {
        engine: {
          backgroundState: {
            ConfigRegistryController: {
              configs: { networks: { 'eip155:1': {} } },
              version: '1',
              lastFetched: null,
              etag: null,
            },
          },
        },
      };
      expect(isConfigRegistryNetworksLoading(state as never)).toBe(false);
    });
  });

  describe('getIsConfigRegistryApiEnabled', () => {
    it('returns true when flag is enabled', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: true,
              },
            },
          },
        },
      };
      expect(getIsConfigRegistryApiEnabled(state as never)).toBe(true);
    });

    it('returns false when flag is disabled', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: false,
              },
            },
          },
        },
      };
      expect(getIsConfigRegistryApiEnabled(state as never)).toBe(false);
    });

    it('returns false when remoteFeatureFlags is empty', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: { remoteFeatureFlags: {} },
          },
        },
      };
      expect(getIsConfigRegistryApiEnabled(state as never)).toBe(false);
    });
  });

  describe('getAdditionalNetworksList', () => {
    it('returns static PopularList when flag is off', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: false,
              },
            },
            ConfigRegistryController: {
              configs: { networks: { 'eip155:1': {} } },
              version: '1',
              lastFetched: Date.now(),
              etag: null,
            },
          },
        },
      };
      const result = getAdditionalNetworksList(state as never);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('chainId');
      expect(result[0]).toHaveProperty('nickname');
      expect(result[0]).toHaveProperty('rpcUrl');
    });

    it('returns static PopularList when flag is on and networks are loading', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: true,
              },
            },
            ConfigRegistryController: {
              configs: { networks: {} },
              version: null,
              lastFetched: null,
              etag: null,
            },
          },
        },
      };
      const result = getAdditionalNetworksList(state as never);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('chainId');
      expect(result[0]).toHaveProperty('nickname');
    });

    it('returns dynamic list when flag is on and API has featured networks', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: true,
              },
            },
            ConfigRegistryController: {
              configs: {
                networks: {
                  'eip155:1329': {
                    chainId: 'eip155:1329',
                    name: 'Sei Network',
                    rpcProviders: {
                      default: {
                        url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                        type: 'infura',
                        networkClientId: 'sei-mainnet',
                      },
                      fallbacks: [],
                    },
                    blockExplorerUrls: {
                      default: 'https://seiscan.io',
                      fallbacks: [],
                    },
                    assets: { native: { symbol: 'SEI', decimals: 6 } },
                    config: {
                      isActive: true,
                      isTestnet: false,
                      isFeatured: true,
                    },
                  },
                },
              },
              version: '1',
              lastFetched: Date.now(),
              etag: null,
            },
            NetworkController: { networkConfigurations: {} },
          },
        },
      };
      const result = getAdditionalNetworksList(state as never);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        chainId: '0x531',
        nickname: 'Sei Network',
        ticker: 'SEI',
      });
    });

    it('returns static list when flag is on but no featured networks from API', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: true,
              },
            },
            ConfigRegistryController: {
              configs: { networks: {} },
              version: '1',
              lastFetched: Date.now(),
              etag: null,
            },
            NetworkController: { networkConfigurations: {} },
          },
        },
      };
      const result = getAdditionalNetworksList(state as never);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('chainId');
      expect(result[0]).toHaveProperty('nickname');
    });

    it('returns dynamic list (empty) when flag is on and all featured networks already added', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: true,
              },
            },
            ConfigRegistryController: {
              configs: {
                networks: {
                  'eip155:1329': {
                    chainId: 'eip155:1329',
                    name: 'Sei Network',
                    rpcProviders: {
                      default: {
                        url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                        type: 'infura',
                        networkClientId: 'sei-mainnet',
                      },
                      fallbacks: [],
                    },
                    blockExplorerUrls: {
                      default: 'https://seiscan.io',
                      fallbacks: [],
                    },
                    assets: { native: { symbol: 'SEI', decimals: 6 } },
                    config: {
                      isActive: true,
                      isTestnet: false,
                      isFeatured: true,
                    },
                  },
                },
              },
              version: '1',
              lastFetched: Date.now(),
              etag: null,
            },
            NetworkController: {
              networkConfigurationsByChainId: { '0x531': { chainId: '0x531' } },
            },
          },
        },
      };
      const result = getAdditionalNetworksList(state as never);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
  describe('getRegistryNetworkImagesByChainId', () => {
    const buildState = (
      networks: Record<string, RegistryNetworkConfig | never>,
      enabled = true,
    ): StateWithPartialEngine => ({
      engine: {
        backgroundState: {
          ConfigRegistryController: {
            configs: { networks },
            version: '1.0',
            lastFetched: 123,
            etag: null,
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              configRegistryApiEnabled: enabled,
            },
            cacheTimestamp: 123,
          },
        },
      },
    });

    it('returns an empty map when the feature flag is off', () => {
      const state = buildState(
        {
          'eip155:99901': {
            chainId: 'eip155:99901',
            imageUrl: 'https://x.png',
          } as never,
        },
        false,
      );
      expect(getRegistryNetworkImagesByChainId(state as never)).toEqual({});
    });

    it('keys registry images by hex and CAIP-2 chain ID and skips non-https URLs', () => {
      const state = buildState({
        'eip155:99901': {
          chainId: 'eip155:99901',
          imageUrl: 'https://example.com/elysium.svg',
        } as never,
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          imageUrl: 'https://example.com/solana.svg',
        } as never,
        'eip155:9999': {
          chainId: 'eip155:9999',
          imageUrl: 'http://insecure.example.com/x.svg',
        } as never,
      });
      const result = getRegistryNetworkImagesByChainId(state as never);
      expect(result['0x1863d']).toEqual({
        uri: 'https://example.com/elysium.svg',
      });
      expect(result['eip155:99901']).toEqual({
        uri: 'https://example.com/elysium.svg',
      });
      expect(result['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp']).toEqual({
        uri: 'https://example.com/solana.svg',
      });
      expect(result['0x270f']).toBeUndefined();
    });
  });
});
