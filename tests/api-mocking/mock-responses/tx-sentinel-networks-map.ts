import type { Mockttp } from 'mockttp';

/**
 * Relay signer addresses returned as `cubistSigners` for every network.
 * Required by `Delegation7702PublishHook` to build the RedeemerEnforcer caveat.
 */
export const TX_SENTINEL_SIGNERS_MOCK = [
  '0xB01caEa8c6C47bbf4F4b4c5080Ca642043359C2E',
];

/**
 * TX Sentinel `/networks` response body (chainId string keys).
 * Each entry is also the `/network` response body for that network.
 * Shared by default mocks and relay E2E overrides (see {@link mockTxSentinelNetworks}).
 */
export const TX_SENTINEL_NETWORKS_MAP = {
  '1': {
    name: 'Mainnet',
    group: 'ethereum',
    chainID: 1,
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    network: 'ethereum-mainnet',
    explorer: 'https://etherscan.io',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: true,
    relayTransactions: true,
    hidden: false,
    sendBundle: true,
  },
  '10': {
    name: 'Optimism Mainnet',
    group: 'optimism',
    chainID: 10,
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    network: 'optimism-mainnet',
    explorer: 'https://optimistic.etherscan.io',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: false,
    relayTransactions: false,
    hidden: false,
    sendBundle: false,
  },
  '11155111': {
    name: 'Sepolia',
    group: 'ethereum',
    chainID: 11155111,
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18,
    },
    network: 'ethereum-sepolia',
    explorer: 'https://sepolia.etherscan.io',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: true,
    relayTransactions: false,
    hidden: false,
    sendBundle: false,
  },
  '1329': {
    name: 'Sei Mainnet',
    group: 'sei',
    chainID: 1329,
    nativeCurrency: {
      name: 'SEI',
      symbol: 'SEI',
      decimals: 18,
    },
    network: 'sei-mainnet',
    explorer: 'https://seiscan.io',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: false,
    relayTransactions: false,
    hidden: false,
    sendBundle: false,
  },
  /**
   * Local Anvil / fixture chain (0x539). Required for EIP-7702 relay + gasless
   * confirmation E2E (`gas-fee-tokens-eip-7702-sponsored.spec.ts`): `isRelaySupported`
   * reads Sentinel `/networks` via `getSentinelNetworkFlags`.
   */
  '1337': {
    name: 'Localhost',
    group: 'ethereum',
    chainID: 1337,
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    network: 'localhost',
    explorer: 'http://localhost:8545/explorer',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: true,
    relayTransactions: true,
    hidden: false,
    sendBundle: false,
  },
  '137': {
    name: 'Polygon Mainnet',
    group: 'polygon',
    chainID: 137,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    network: 'polygon-mainnet',
    explorer: 'https://polygonscan.com/',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: false,
    relayTransactions: false,
    hidden: false,
    sendBundle: false,
  },
  '143': {
    name: 'Monad Mainnet',
    group: 'monad',
    chainID: 143,
    nativeCurrency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18,
    },
    network: 'monad-mainnet',
    explorer: 'https://monadscan.com/',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: false,
    relayTransactions: false,
    hidden: false,
    sendBundle: false,
  },
  '42161': {
    name: 'Arbitrum Mainnet',
    group: 'arbitrum',
    chainID: 42161,
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    network: 'arbitrum-mainnet',
    explorer: 'https://arbiscan.io/',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: true,
    relayTransactions: false,
    hidden: false,
    sendBundle: false,
  },
  '43114': {
    name: 'Avalanche Mainnet',
    group: 'avalanche',
    chainID: 43114,
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18,
    },
    network: 'avalanche-mainnet',
    explorer: 'https://avascan.info/',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: false,
    relayTransactions: false,
    hidden: false,
    sendBundle: false,
  },
  '56': {
    name: 'BNB Smart Chain',
    group: 'bnb',
    chainID: 56,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    network: 'bsc-mainnet',
    explorer: 'https://bscscan.com/',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: true,
    relayTransactions: true,
    hidden: false,
    sendBundle: true,
  },
  '59144': {
    name: 'Linea Mainnet',
    group: 'linea',
    chainID: 59144,
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    network: 'linea-mainnet',
    explorer: 'https://lineascan.build',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: false,
    relayTransactions: false,
    hidden: false,
    sendBundle: false,
  },
  '8453': {
    name: 'Base Mainnet',
    group: 'base',
    chainID: 8453,
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    network: 'base-mainnet',
    explorer: 'https://basescan.org',
    confirmations: true,
    cubistSigners: TX_SENTINEL_SIGNERS_MOCK,
    smartTransactions: true,
    relayTransactions: true,
    hidden: false,
    sendBundle: false,
  },
};

/**
 * Builds the TX Sentinel base URL for a network subdomain.
 *
 * @param subdomain - Network subdomain, e.g. `ethereum-mainnet`.
 * @returns The TX Sentinel base URL.
 */
export function getTxSentinelUrl(subdomain: string): string {
  return `https://tx-sentinel-${subdomain}.api.cx.metamask.io`;
}

/**
 * Default mocks for the single network endpoint (`/network`) of every network
 * in {@link TX_SENTINEL_NETWORKS_MAP}.
 */
export const TX_SENTINEL_NETWORK_MOCKS = Object.values(
  TX_SENTINEL_NETWORKS_MAP,
).map((network) => ({
  urlEndpoint: `${getTxSentinelUrl(network.network)}/network`,
  responseCode: 200,
  response: network,
}));

/**
 * Overrides TX Sentinel `/networks` and each `/network` endpoint, including
 * Android `/proxy` requests, with the given networks.
 *
 * @param mockServer - The mock server.
 * @param networks - TX Sentinel networks keyed by decimal chain ID.
 * @param priority - Mock priority, above the defaults.
 */
export async function mockTxSentinelNetworks(
  mockServer: Mockttp,
  networks: Record<string, { network: string }>,
  priority: number,
): Promise<void> {
  await mockTxSentinelEndpoint(
    mockServer,
    `${getTxSentinelUrl('ethereum-mainnet')}/networks`,
    networks,
    priority,
  );

  for (const network of Object.values(networks)) {
    await mockTxSentinelEndpoint(
      mockServer,
      `${getTxSentinelUrl(network.network)}/network`,
      network,
      priority,
    );
  }
}

async function mockTxSentinelEndpoint(
  mockServer: Mockttp,
  url: string,
  json: object,
  priority: number,
): Promise<void> {
  const handler = () => ({ statusCode: 200, json });

  await mockServer.forGet(url).asPriority(priority).thenCallback(handler);

  await mockServer
    .forGet('/proxy')
    .asPriority(priority)
    .matching((request) => new URL(request.url).searchParams.get('url') === url)
    .thenCallback(handler);
}
