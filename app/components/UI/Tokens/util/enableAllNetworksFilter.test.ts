import { enableAllNetworksFilter } from './enableAllNetworksFilter';
import { NetworkConfiguration } from '@metamask/network-controller';

describe('enableAllNetworksFilter', () => {
  const mockNetworks: Record<string, NetworkConfiguration> = {
    '0x1': {
      blockExplorerUrls: [],
      chainId: '0x1',
      defaultRpcEndpointIndex: 0,
      name: 'Ethereum Mainnet',
      nickname: 'Ethereum Mainnet',
      nativeCurrency: 'ETH',
      rpcEndpoints: [
        {
          networkClientId: 'mainnet',
          type: 'infura',
          url: 'https://mainnet.infura.io/v3/1234567890',
        },
      ],
    } as NetworkConfiguration,
    '0x5': {
      blockExplorerUrls: [],
      chainId: '0x5',
      defaultRpcEndpointIndex: 0,
      name: 'Goerli',
      nickname: 'Goerli Testnet',
      nativeCurrency: 'GoerliETH',
      rpcEndpoints: [
        {
          networkClientId: 'goerli',
          type: 'infura',
          url: 'https://goerli.infura.io/v3/1234567890',
        },
      ],
    } as NetworkConfiguration,
    '0x89': {
      blockExplorerUrls: [],
      chainId: '0x89',
      defaultRpcEndpointIndex: 0,
      name: 'Polygon',
      nickname: 'Polygon',
      nativeCurrency: 'MATIC',
      rpcEndpoints: [
        {
          networkClientId: 'polygon',
          type: 'infura',
          url: 'https://polygon-mainnet.infura.io/v3/1234567890',
        },
      ],
    } as NetworkConfiguration,
  };

  it('should enable all networks when excludeChainIds is false', () => {
    const result = enableAllNetworksFilter(mockNetworks, false);

    expect(result).toEqual({
      '0x1': true,
      '0x5': true,
      '0x89': true,
    });
  });

  it('should exclude testnet networks when excludeChainIds is true', () => {
    const result = enableAllNetworksFilter(mockNetworks, true);

    expect(result).toEqual({
      '0x1': true,
      '0x89': true,
    });
    expect(result['0x5']).toBeUndefined();
  });

  it('should handle empty networks object', () => {
    const result = enableAllNetworksFilter({}, false);

    expect(result).toEqual({});
  });
});
