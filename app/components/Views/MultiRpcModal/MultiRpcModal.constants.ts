export const SAMPLE_NETWORK_CONFIGURATIONS = {
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
};
