import { NetworkConfiguration } from '@metamask/network-controller';
import { getNetworkConfigurationsToPoll } from './utils';

describe('getNetworkConfigurationsToPoll', () => {
  const mockNetworkConfigurations = {
    '0x1': {
      blockExplorerUrls: [],
      chainId: '0x1',
      defaultRpcEndpointIndex: 0,
      name: 'Mainnet',
      nativeCurrency: 'ETH',
      rpcEndpoints: [
        {
          networkClientId: 'mainnet',
          type: 'infura',
          url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
        },
      ],
    },
    '0x5': {
      blockExplorerUrls: [],
      chainId: '0x5',
      defaultRpcEndpointIndex: 0,
      name: 'Goerli',
      nativeCurrency: 'GoerliETH',
      rpcEndpoints: [
        {
          networkClientId: 'goerli',
          type: 'infura',
          url: 'https://goerli.infura.io/v3/{infuraProjectId}',
        },
      ],
    },
    '0xaa36a7': {
      blockExplorerUrls: [],
      chainId: '0xaa36a7',
      defaultRpcEndpointIndex: 0,
      name: 'Sepolia',
      nativeCurrency: 'SepoliaETH',
      rpcEndpoints: [
        {
          networkClientId: 'sepolia',
          type: 'infura',
          url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
        },
      ],
    },
    '0xe704': {
      blockExplorerUrls: [],
      chainId: '0xe704',
      defaultRpcEndpointIndex: 0,
      name: 'Linea Goerli',
      nativeCurrency: 'LineaETH',
      rpcEndpoints: [
        {
          networkClientId: 'linea-goerli',
          type: 'infura',
          url: 'https://linea-goerli.infura.io/v3/{infuraProjectId}',
        },
      ],
    },
    '0xe705': {
      blockExplorerUrls: [],
      chainId: '0xe705',
      defaultRpcEndpointIndex: 0,
      name: 'Linea Sepolia',
      nativeCurrency: 'LineaETH',
      rpcEndpoints: [
        {
          networkClientId: 'linea-sepolia',
          type: 'infura',
          url: 'https://linea-sepolia.infura.io/v3/{infuraProjectId}',
        },
      ],
    },
    '0xe708': {
      blockExplorerUrls: [],
      chainId: '0xe708',
      defaultRpcEndpointIndex: 0,
      name: 'Linea Mainnet',
      nativeCurrency: 'ETH',
      rpcEndpoints: [
        {
          networkClientId: 'linea-mainnet',
          type: 'infura',
          url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
        },
      ],
    },
  };

  it('should return all networks if isAllNetworksSelected is true', () => {
    const result = getNetworkConfigurationsToPoll(
      mockNetworkConfigurations as Record<string, NetworkConfiguration>,
      true,
    );

    expect(result).toEqual(Object.values(mockNetworkConfigurations));
  });

  it('should return only popular, mainnet, or linea mainnet networks if isAllNetworksSelected is false and current chain is popular', () => {
    const result = getNetworkConfigurationsToPoll(
      mockNetworkConfigurations as Record<string, NetworkConfiguration>,
      false,
    );

    const expectedResult = [
      mockNetworkConfigurations['0x1'],
      mockNetworkConfigurations['0xe708'],
    ];

    expect(result).toEqual(expect.arrayContaining(expectedResult));
  });

  it('should return only mainnet and linea mainnet if isAllNetworksSelected is false and current chain is not popular', () => {
    const result = getNetworkConfigurationsToPoll(
      mockNetworkConfigurations as Record<string, NetworkConfiguration>,
      false,
    );

    const expectedResult = [
      mockNetworkConfigurations['0x1'],
      mockNetworkConfigurations['0xe708'],
    ];

    expect(result).toEqual(expect.arrayContaining(expectedResult));
  });

  it('should return all networks if the current chain ID is mainnet or linea mainnet regardless of popularity', () => {
    const resultMainnet = getNetworkConfigurationsToPoll(
      mockNetworkConfigurations as Record<string, NetworkConfiguration>,
      false,
    );

    const resultLineaMainnet = getNetworkConfigurationsToPoll(
      mockNetworkConfigurations as Record<string, NetworkConfiguration>,
      false,
    );

    expect(resultMainnet).toEqual(Object.values(mockNetworkConfigurations));
    expect(resultLineaMainnet).toEqual(
      Object.values(mockNetworkConfigurations),
    );
  });
});
