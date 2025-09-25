import {
  selectNetworkControllerState,
  selectProviderConfig,
  selectEvmTicker,
  selectChainId,
  selectProviderType,
  selectNickname,
  selectRpcUrl,
  selectNetworkStatus,
  selectNetworkConfigurations,
  selectNetworkClientId,
  selectIsAllNetworks,
  selectNetworkConfigurationByChainId,
  selectNativeCurrencyByChainId,
  selectCustomNetworkConfigurationsByCaipChainId,
  selectPopularNetworkConfigurationsByCaipChainId,
  selectIsAllPopularNetworks,
} from './networkController';
import { RootState } from '../reducers';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import { KnownCaipNamespace } from '@metamask/utils';

describe('networkSelectors', () => {
  const mockState = {
    engine: {
      backgroundState: {
        NetworkController: {
          selectedNetworkClientId: 'custom-network',
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              nativeCurrency: 'ETH',
              name: 'Ethereum Mainnet',
              rpcEndpoints: [
                {
                  networkClientId: 'infura-mainnet',
                  type: 'infura',
                  url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                },
              ],
              blockExplorerUrls: ['https://etherscan.io'],
            },
            '0x89': {
              chainId: '0x89',
              nativeCurrency: 'MATIC',
              name: 'Polygon',
              rpcEndpoints: [
                {
                  networkClientId: 'custom-network',
                  type: 'custom',
                  url: 'https://polygon-rpc.com',
                },
              ],
              blockExplorerUrls: ['https://polygonscan.com'],
            },
          },
          networksMetadata: {
            'custom-network': { status: 'active' },
          },
        },
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: SolScope.Mainnet,

          multichainNetworkConfigurationsByChainId: {},
        },
      },
    },
  } as unknown as RootState;

  it('selectNetworkControllerState should return the network controller state', () => {
    expect(selectNetworkControllerState(mockState)).toEqual(
      mockState.engine.backgroundState.NetworkController,
    );
  });

  it('selectProviderConfig should return the provider config for the selected network', () => {
    expect(selectProviderConfig(mockState)).toEqual({
      chainId: '0x89',
      ticker: 'MATIC',
      rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
      type: 'rpc',
      id: 'custom-network',
      nickname: 'Polygon',
      rpcUrl: 'https://polygon-rpc.com',
    });
  });

  it('selectEvmTicker should return the ticker of the provider config', () => {
    expect(selectEvmTicker(mockState)).toBe('MATIC');
  });

  it('selectChainId should return the chainId of the provider config', () => {
    expect(selectChainId(mockState)).toBe('0x89');
  });

  it('selectProviderType should return the type of the provider config', () => {
    expect(selectProviderType(mockState)).toBe('rpc');
  });

  it('selectNickname should return the nickname of the provider config', () => {
    expect(selectNickname(mockState)).toBe('Polygon');
  });

  it('selectRpcUrl should return the rpcUrl of the provider config', () => {
    expect(selectRpcUrl(mockState)).toBe('https://polygon-rpc.com');
  });

  it('selectNetworkStatus should return the network status for the selected network', () => {
    expect(selectNetworkStatus(mockState)).toBe('active');
  });

  it('selectNetworkConfigurations should return the network configurations by chainId', () => {
    expect(selectNetworkConfigurations(mockState)).toEqual(
      mockState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
    );
  });

  it('selectNetworkClientId should return the selected network client ID', () => {
    expect(selectNetworkClientId(mockState)).toBe('custom-network');
  });

  it('selectIsAllNetworks should return false if tokenNetworkFilter length is greater than 1', () => {
    expect(
      selectIsAllNetworks({
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
            },
            PreferencesController: {
              ...mockState.engine.backgroundState.PreferencesController,
              tokenNetworkFilter: { '0x1': 'true' },
            },
          },
        },
      }),
    ).toBe(false);
  });

  it('selectNetworkConfigurationByChainId should return the network configuration for a given chainId', () => {
    expect(selectNetworkConfigurationByChainId(mockState, '0x89')).toEqual(
      mockState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId['0x89'],
    );
  });

  it('selectNativeCurrencyByChainId should return the native currency for a given chainId', () => {
    expect(selectNativeCurrencyByChainId(mockState, '0x1')).toBe('ETH');
  });

  it('should return the default provider config if no matching network is found', () => {
    const noMatchState = { ...mockState };
    noMatchState.engine.backgroundState.NetworkController.selectedNetworkClientId =
      'unknown-network';
    expect(selectProviderConfig(noMatchState)).toEqual({
      chainId: '0x89',
      id: 'custom-network',
      nickname: 'Polygon',
      rpcPrefs: {
        blockExplorerUrl: 'https://polygonscan.com',
      },
      rpcUrl: 'https://polygon-rpc.com',
      ticker: 'MATIC',
      type: 'rpc',
    });
  });

  it('selectNetworkConfigurationByChainId should return null if the chainId does not exist', () => {
    expect(selectNetworkConfigurationByChainId(mockState, '0x9999')).toBeNull();
  });

  describe('selectCustomNetworkConfigurationsByCaipChainId', () => {
    it('should return non-popular networks and testnet networks', () => {
      const stateWithVariousNetworks = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              networkConfigurationsByChainId: {
                '0x1': {
                  // Mainnet - popular
                  chainId: '0x1',
                  nativeCurrency: 'ETH',
                  name: 'Ethereum Mainnet',
                  rpcEndpoints: [
                    {
                      networkClientId: 'mainnet',
                      type: 'infura',
                      url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    },
                  ],
                },
                '0xe708': {
                  // Linea Mainnet - popular
                  chainId: '0xe708',
                  nativeCurrency: 'ETH',
                  name: 'Linea Mainnet',
                  rpcEndpoints: [
                    {
                      networkClientId: 'linea-mainnet',
                      type: 'infura',
                      url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                    },
                  ],
                },
                '0x12345': {
                  // Custom network
                  chainId: '0x12345',
                  nativeCurrency: 'CUSTOM',
                  name: 'Custom Network',
                  rpcEndpoints: [
                    {
                      networkClientId: 'custom-1',
                      type: 'custom',
                      url: 'https://custom-rpc.com',
                    },
                  ],
                },
                '0x67890': {
                  // Another custom network
                  chainId: '0x67890',
                  nativeCurrency: 'TEST',
                  name: 'Test Network',
                  rpcEndpoints: [
                    {
                      networkClientId: 'custom-2',
                      type: 'custom',
                      url: 'https://test-rpc.com',
                    },
                  ],
                },
              },
            },
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              multichainNetworkConfigurationsByChainId: {
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
                  // Solana Mainnet
                  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
                  nativeCurrency: 'SOL',
                  name: 'Solana Mainnet',
                  rpcEndpoints: [],
                },
                'bip122:000000000933ea01ad0ee984209779ba': {
                  // Bitcoin Testnet
                  chainId: 'bip122:000000000933ea01ad0ee984209779ba',
                  nativeCurrency: 'BTC',
                  name: 'Bitcoin Testnet',
                  rpcEndpoints: [],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectCustomNetworkConfigurationsByCaipChainId(
        stateWithVariousNetworks,
      );

      // Should include both custom networks and testnet networks
      // 2 custom networks + 1 btc testnet
      expect(result).toHaveLength(3);
      // btc testnet is included
      expect(result.map((n) => n.chainId)).toContain(
        'bip122:000000000933ea01ad0ee984209779ba',
      );
      // custom networks are included
      expect(result.map((n) => n.chainId)).toContain('0x12345');
      expect(result.map((n) => n.chainId)).toContain('0x67890');
      // popular networks aren't included
      expect(result.map((n) => n.chainId)).not.toContain('0x1');
      expect(result.map((n) => n.chainId)).not.toContain('0xe708');
      // solana mainnet isn't included
      expect(result.map((n) => n.caipChainId)).not.toContain(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
    });

    it('should return empty array when there are no custom networks or testnets', () => {
      const stateWithOnlyPopularNetworks = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              networkConfigurationsByChainId: {
                '0x1': {
                  // Mainnet - popular
                  chainId: '0x1',
                  nativeCurrency: 'ETH',
                  name: 'Ethereum Mainnet',
                  rpcEndpoints: [],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectCustomNetworkConfigurationsByCaipChainId(
        stateWithOnlyPopularNetworks,
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('selectPopularNetworkConfigurationsByCaipChainId', () => {
    it('should return popular networks', () => {
      const stateWithVariousNetworks = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              networkConfigurationsByChainId: {
                '0x1': {
                  // Mainnet - popular
                  chainId: '0x1',
                  nativeCurrency: 'ETH',
                  name: 'Ethereum Mainnet',
                  rpcEndpoints: [
                    {
                      networkClientId: 'mainnet',
                      type: 'infura',
                      url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    },
                  ],
                },
                '0xe708': {
                  // Linea Mainnet - popular
                  chainId: '0xe708',
                  nativeCurrency: 'ETH',
                  name: 'Linea Mainnet',
                  rpcEndpoints: [
                    {
                      networkClientId: 'linea-mainnet',
                      type: 'infura',
                      url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                    },
                  ],
                },
                '0x12345': {
                  // Custom network
                  chainId: '0x12345',
                  nativeCurrency: 'CUSTOM',
                  name: 'Custom Network',
                  rpcEndpoints: [
                    {
                      networkClientId: 'custom-1',
                      type: 'custom',
                      url: 'https://custom-rpc.com',
                    },
                  ],
                },
              },
            },
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              multichainNetworkConfigurationsByChainId: {
                [SolScope.Mainnet]: {
                  // Solana Mainnet - popular
                  chainId: SolScope.Mainnet,
                  nativeCurrency: 'SOL',
                  name: 'Solana Mainnet',
                  rpcEndpoints: [],
                  ticker: 'SOL',
                  decimals: 5,
                  imageSource: 1,
                  isTestnet: false,
                },
                [BtcScope.Mainnet]: {
                  // Bitcoin Mainnet - popular
                  chainId: BtcScope.Mainnet,
                  nativeCurrency: 'BTC',
                  name: 'Bitcoin Mainnet',
                  rpcEndpoints: [],
                  ticker: 'BTC',
                  decimals: 8,
                  imageSource: 1,
                  isTestnet: false,
                },
                'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': {
                  // Solana Devnet - popular
                  chainId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
                  nativeCurrency: 'SOL',
                  name: 'Solana Devnet',
                  rpcEndpoints: [],
                  ticker: 'SOL',
                  decimals: 5,
                  imageSource: 1,
                  isTestnet: true,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectPopularNetworkConfigurationsByCaipChainId(
        stateWithVariousNetworks,
      );

      // Should include only popular networks that aren't testnets
      // This includes: mainnet, linea, solana mainnet, and bitcoin mainnet
      expect(result.length).toBeGreaterThanOrEqual(4); // mainnet, linea, solana mainnet, and bitcoin mainnet

      // Popular networks are included
      expect(result.map((n) => n.chainId)).toEqual(
        expect.arrayContaining(['0x1', '0xe708']),
      );
      expect(result.map((n) => n.caipChainId)).toEqual(
        expect.arrayContaining(['eip155:1', 'eip155:59144']),
      );

      // Custom networks shouldn't be included
      expect(result.map((n) => n.chainId)).not.toContain('0x12345');
      expect(result.map((n) => n.chainId)).not.toContain('0x67890');

      // Check non-EVM mainnet networks are included
      expect(result.map((n) => n.caipChainId)).toContain(SolScope.Mainnet);
      expect(result.map((n) => n.caipChainId)).toContain(BtcScope.Mainnet);
      expect(result.map((n) => n.chainId)).not.toContain(
        'bip122:000000000933ea01ad0ee984209779ba',
      );
    });

    it('should return empty array when there are no popular networks', () => {
      const stateWithOnlyCustomNetworks = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              networkConfigurationsByChainId: {
                '0x12345': {
                  // Custom network
                  chainId: '0x12345',
                  nativeCurrency: 'CUSTOM',
                  name: 'Custom Network',
                  rpcEndpoints: [],
                },
              },
            },
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      } as unknown as RootState;

      const result = selectPopularNetworkConfigurationsByCaipChainId(
        stateWithOnlyCustomNetworks,
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('selectIsAllPopularNetworks', () => {
    it('should return true for Ethereum Mainnet', () => {
      const mainnetState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              selectedNetworkClientId: 'mainnet',
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  nativeCurrency: 'ETH',
                  name: 'Ethereum Mainnet',
                  rpcEndpoints: [
                    {
                      networkClientId: 'mainnet',
                      type: 'infura',
                      url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      expect(selectIsAllPopularNetworks(mainnetState)).toBe(true);
    });

    it('should return true for Linea Mainnet', () => {
      const lineaState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              selectedNetworkClientId: 'linea-mainnet',
              networkConfigurationsByChainId: {
                '0xe708': {
                  chainId: '0xe708',
                  nativeCurrency: 'ETH',
                  name: 'Linea Mainnet',
                  rpcEndpoints: [
                    {
                      networkClientId: 'linea-mainnet',
                      type: 'infura',
                      url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      expect(selectIsAllPopularNetworks(lineaState)).toBe(true);
    });

    it('should return true for Solana networks', () => {
      const solanaState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            MultichainNetworkController: {
              isEvmSelected: false,
              selectedMultichainNetworkChainId:
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              multichainNetworkConfigurationsByChainId: {
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
                  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
                  nativeCurrency: 'SOL',
                  name: 'Solana Mainnet',
                  rpcEndpoints: [],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      expect(selectIsAllPopularNetworks(solanaState)).toBe(true);
    });

    it('should return true for networks in PopularList', () => {
      // Testing with Avalanche (0xa86a) which should be in PopularList
      const avalancheState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              selectedNetworkClientId: 'avalanche',
              networkConfigurationsByChainId: {
                '0xa86a': {
                  chainId: '0xa86a',
                  nativeCurrency: 'AVAX',
                  name: 'Avalanche C-Chain',
                  rpcEndpoints: [
                    {
                      networkClientId: 'avalanche',
                      type: 'infura',
                      url: 'https://avalanche-mainnet.infura.io/v3/{infuraProjectId}',
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      expect(selectIsAllPopularNetworks(avalancheState)).toBe(true);
    });

    it('should return false for custom networks', () => {
      const customNetworkState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              selectedNetworkClientId: 'custom-network',
              networkConfigurationsByChainId: {
                '0x12345': {
                  chainId: '0x12345',
                  nativeCurrency: 'CUSTOM',
                  name: 'Custom Network',
                  rpcEndpoints: [
                    {
                      networkClientId: 'custom-network',
                      type: 'custom',
                      url: 'https://custom-rpc.com',
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      expect(selectIsAllPopularNetworks(customNetworkState)).toBe(false);
    });

    it('should handle chain IDs with Solana namespace correctly', () => {
      const solanaDevnetState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            MultichainNetworkController: {
              isEvmSelected: false,
              selectedMultichainNetworkChainId: `${KnownCaipNamespace.Solana}:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`,
              multichainNetworkConfigurationsByChainId: {
                [`${KnownCaipNamespace.Solana}:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`]:
                  {
                    chainId: `${KnownCaipNamespace.Solana}:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`,
                    nativeCurrency: 'SOL',
                    name: 'Solana Devnet',
                    rpcEndpoints: [],
                  },
              },
            },
          },
        },
      } as unknown as RootState;

      expect(selectIsAllPopularNetworks(solanaDevnetState)).toBe(true);
    });
  });
});
