import {
  selectNetworkControllerState,
  selectProviderConfig,
  selectTicker,
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
} from './networkController';
import { RootState } from '../reducers';

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
            '0x2': {
              chainId: '0x2',
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
      chainId: '0x2',
      ticker: 'MATIC',
      rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
      type: 'rpc',
      id: 'custom-network',
      nickname: 'Polygon',
      rpcUrl: 'https://polygon-rpc.com',
    });
  });

  it('selectTicker should return the ticker of the provider config', () => {
    expect(selectTicker(mockState)).toBe('MATIC');
  });

  it('selectChainId should return the chainId of the provider config', () => {
    expect(selectChainId(mockState)).toBe('0x2');
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

  it('selectIsAllNetworks should return false if tokenNetworkFilter length does not match networkConfigurations length', () => {
    const tokenNetworkFilter = { '0x1': 'true' };
    expect(
      selectIsAllNetworks.resultFunc(
        mockState.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId,
        tokenNetworkFilter,
      ),
    ).toBe(false);
  });

  it('selectNetworkConfigurationByChainId should return the network configuration for a given chainId', () => {
    expect(selectNetworkConfigurationByChainId(mockState, '0x2')).toEqual(
      mockState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId['0x2'],
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
      chainId: '0x2',
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
});
