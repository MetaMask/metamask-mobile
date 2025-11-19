/**
 * Mock responses for chainid.network API
 * This provides a subset of commonly used blockchain networks for testing
 */

export const MOCK_CHAINS_DATA = [
  {
    name: 'Ethereum Mainnet',
    chain: 'ETH',
    icon: 'ethereum',
    rpc: [
      'https://mainnet.infura.io/v3/${INFURA_API_KEY}',
      'https://api.mycryptoapi.com/eth',
      'https://cloudflare-eth.com',
    ],
    features: [{ name: 'EIP155' }, { name: 'EIP1559' }],
    faucets: [],
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    infoURL: 'https://ethereum.org',
    shortName: 'eth',
    chainId: 1,
    networkId: 1,
    slip44: 60,
    ens: {
      registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    },
    explorers: [
      {
        name: 'etherscan',
        url: 'https://etherscan.io',
        standard: 'EIP3091',
      },
    ],
  },
  {
    name: 'Gnosis',
    chain: 'GNO',
    icon: 'gnosis',
    rpc: ['https://rpc.gnosischain.com', 'https://rpc.ankr.com/gnosis'],
    features: [{ name: 'EIP155' }, { name: 'EIP1559' }],
    faucets: [],
    nativeCurrency: {
      name: 'xDAI',
      symbol: 'XDAI',
      decimals: 18,
    },
    infoURL: 'https://gnosischain.com',
    shortName: 'gno',
    chainId: 100,
    networkId: 100,
    slip44: 700,
    explorers: [
      {
        name: 'gnosisscan',
        url: 'https://gnosisscan.io',
        standard: 'EIP3091',
      },
    ],
  },
  {
    name: 'Polygon',
    chain: 'MATIC',
    icon: 'polygon',
    rpc: ['https://polygon-rpc.com', 'https://rpc-mainnet.matic.network'],
    features: [{ name: 'EIP155' }, { name: 'EIP1559' }],
    faucets: [],
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    infoURL: 'https://polygon.technology',
    shortName: 'matic',
    chainId: 137,
    networkId: 137,
    slip44: 966,
    explorers: [
      {
        name: 'polygonscan',
        url: 'https://polygonscan.com',
        standard: 'EIP3091',
      },
    ],
  },
];

export const CHAINS_NETWORK_MOCK_RESPONSE = MOCK_CHAINS_DATA;

/**
 * Mock response for chainid.network/chains.json endpoint
 */
export const mockChainsNetworkResponse = () => ({
  status: 200,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(CHAINS_NETWORK_MOCK_RESPONSE),
});
