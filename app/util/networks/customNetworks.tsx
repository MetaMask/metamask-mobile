import { ImageSourcePropType } from 'react-native';
import { CaipChainId, Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { BtcScope, SolScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

export interface Network {
  chainId: Hex;
  nickname: string;
  rpcPrefs: {
    blockExplorerUrl: string;
    imageSource?: ImageSourcePropType;
    imageUrl?: string;
  };
  rpcUrl: string;
  failoverRpcUrls: string[];
  ticker: string;
  /**
   * Not supported by Infura
   */
  warning?: boolean;
}

export const QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME = {
  'ethereum-mainnet': () => process.env.QUICKNODE_MAINNET_URL,
  'linea-mainnet': () => process.env.QUICKNODE_LINEA_MAINNET_URL,
  'arbitrum-mainnet': () => process.env.QUICKNODE_ARBITRUM_URL,
  'avalanche-mainnet': () => process.env.QUICKNODE_AVALANCHE_URL,
  'optimism-mainnet': () => process.env.QUICKNODE_OPTIMISM_URL,
  'polygon-mainnet': () => process.env.QUICKNODE_POLYGON_URL,
  'base-mainnet': () => process.env.QUICKNODE_BASE_URL,
};

export function getFailoverUrlsForInfuraNetwork(
  infuraNetwork: keyof typeof QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME,
) {
  const url = QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME[infuraNetwork]();
  if (url) {
    return [url];
  }
  return [];
}

export const PopularList = [
  {
    chainId: toHex('43114'),
    nickname: 'Avalanche C-Chain',
    rpcUrl: `https://avalanche-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('avalanche-mainnet'),
    ticker: 'AVAX',
    rpcPrefs: {
      blockExplorerUrl: 'https://snowtrace.io',
      imageUrl: 'AVAX',
      imageSource: require('../../images/avalanche.png'),
    },
  },
  {
    chainId: toHex('42161'),
    nickname: 'Arbitrum One',
    rpcUrl: `https://arbitrum-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('arbitrum-mainnet'),
    ticker: 'ETH',
    rpcPrefs: {
      blockExplorerUrl: 'https://arbiscan.io',
      imageUrl: 'AETH',
      imageSource: require('../../images/arbitrum.png'),
    },
  },
  {
    chainId: toHex('56'),
    nickname: 'BNB Smart Chain Mainnet',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    failoverRpcUrls: [],
    ticker: 'BNB',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://bscscan.com',
      imageUrl: 'BNB',
      imageSource: require('../../images/binance.png'),
    },
  },
  {
    chainId: toHex('8453'),
    nickname: 'Base',
    rpcUrl: `https://base-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('base-mainnet'),
    ticker: 'ETH',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://basescan.org',
      imageUrl: 'BASE',
      imageSource: require('../../images/base.png'),
    },
  },
  {
    chainId: toHex('10'),
    nickname: 'OP Mainnet',
    rpcUrl: `https://optimism-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('optimism-mainnet'),
    ticker: 'ETH',
    rpcPrefs: {
      blockExplorerUrl: 'https://optimistic.etherscan.io',
      imageUrl: 'OPTIMISM',
      imageSource: require('../../images/optimism.png'),
    },
  },
  {
    chainId: toHex('11297108109'),
    nickname: 'Palm',
    rpcUrl: `https://palm-mainnet.infura.io/v3/${infuraProjectId}`,
    // Quicknode does not support Palm at this time
    failoverRpcUrls: [],
    ticker: 'PALM',
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.palm.io',
      imageUrl: 'PALM',
      imageSource: require('../../images/palm.png'),
    },
  },
  {
    chainId: toHex('137'),
    nickname: 'Polygon Mainnet',
    rpcUrl: `https://polygon-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('polygon-mainnet'),
    ticker: 'POL',
    rpcPrefs: {
      blockExplorerUrl: 'https://polygonscan.com',
      imageUrl: 'POL',
      imageSource: require('../../images/pol.png'),
    },
  },
  {
    chainId: toHex('324'),
    nickname: 'zkSync Mainnet',
    rpcUrl: `https://mainnet.era.zksync.io`,
    failoverRpcUrls: [],
    ticker: 'ETH',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.zksync.io/',
      imageUrl: 'ZK_SYNC',
      imageSource: require('../../images/zk-sync.png'),
    },
  },
] satisfies Network[];

export const getNonEvmNetworkImageSourceByChainId = (chainId: CaipChainId) => {
  if (chainId === SolScope.Mainnet) {
    return require('../../images/solana-logo.png');
  }
  if (chainId === BtcScope.Mainnet) {
    return require('../../images/bitcoin-logo.png');
  }
  return undefined;
};

export const INFURA_TESTNET_CHAIN_IDS = {
  GOERLI: '0x5',
  LINEA_GOERLI: '0xe704',
  SEPOLIA: '0xaa36a7',
  HOLESKY: '0x4268',
  LINEA_SEPOLIA: '0xe705',
  AMOY: '0x13882',
  BASE_SEPOLIA: '0x14a34',
  OPTIMISM_SEPOLIA: '0xaa37dc',
  ARBITRUM_SEPOLIA: '0x66eee',
  PALM_TESTNET: '0x2a15c3083',
  AVALANCHE_TESTNET: '0xa869',
  CELO_TESTNET: '0xaef3',
  ZK_SYNC_ERA_TESTNET: '0x12c',
  BSC_TESTNET: '0x61',
  MANTA_SEPOLIA: '0x138b',
  OPBNB_TESTNET: '0x15eb',
  SCROLL_SEPOLIA: '0x8274f',
  UNICHAIN_SEPOLIA: '0x515',
} as const;

export const infuraChainIdsTestNets: string[] = [
  INFURA_TESTNET_CHAIN_IDS.GOERLI,
  INFURA_TESTNET_CHAIN_IDS.LINEA_GOERLI,
  INFURA_TESTNET_CHAIN_IDS.SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.HOLESKY,
  INFURA_TESTNET_CHAIN_IDS.LINEA_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.AMOY,
  INFURA_TESTNET_CHAIN_IDS.BASE_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.OPTIMISM_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.ARBITRUM_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.PALM_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.AVALANCHE_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.CELO_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.ZK_SYNC_ERA_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.BSC_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.MANTA_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.OPBNB_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.SCROLL_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.UNICHAIN_SEPOLIA,
];

export const allowedInfuraHosts = [
  // Ethereum
  'mainnet.infura.io',
  // Linea
  'linea-mainnet.infura.io',
  // Polygon
  'polygon-mainnet.infura.io',
  // Base
  'base-mainnet.infura.io',
  // Blast
  'blast-mainnet.infura.io',
  // Optimism
  'optimism-mainnet.infura.io',
  // Arbitrum
  'arbitrum-mainnet.infura.io',
  // Palm
  'palm-mainnet.infura.io',
  // Avalanche
  'avalanche-mainnet.infura.io',
  // Celo
  'celo-mainnet.infura.io',
  // ZKSync
  'zksync-mainnet.infura.io',
  // BSC
  'bsc-mainnet.infura.io',
  // Mantle
  'mantle-mainnet.infura.io',
  // OPBNB
  'opbnb-mainnet.infura.io',
  // Scroll
  'scroll-mainnet.infura.io',
];

/**
 * List of popularList will change in the future, removing networks from the list will lead to users not
 * seeing the logo of the network anymore.
 * We can keep this new list updated with any network removed from the popular list so we keep returning the logo of the network.
 */
export const UnpopularNetworkList = [
  {
    chainId: toHex('250'),
    nickname: 'Fantom Opera',
    rpcUrl: 'https://rpc.ftm.tools/',
    failoverRpcUrls: [],
    ticker: 'FTM',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://ftmscan.com',
      imageUrl: 'FTM',
      imageSource: require('../../images/fantom.png'),
    },
  },
  {
    chainId: toHex('1666600000'),
    nickname: 'Harmony Mainnet Shard 0',
    rpcUrl: 'https://api.harmony.one/',
    failoverRpcUrls: [],
    ticker: 'ONE',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.harmony.one',
      imageUrl: 'ONE',
      imageSource: require('../../images/harmony.png'),
    },
  },
];

export const NETWORK_CHAIN_ID: {
  readonly FLARE_MAINNET: '0xe';
  readonly SONGBIRD_TESTNET: '0x13';
  readonly APE_CHAIN_TESTNET: '0x8157';
  readonly APE_CHAIN_MAINNET: '0x8173';
  readonly GRAVITY_ALPHA_MAINNET: '0x659';
  readonly KAIA_MAINNET: '0x2019';
  readonly KAIA_KAIROS_TESTNET: '0x3e9';
  readonly SONEIUM_MAINNET: '0x74c';
  readonly SONEIUM_MINATO_TESTNET: '0x79a';
  readonly XRPLEVM_TESTNET: '0x161c28';
  readonly JOC_MAINNET: '0x51';
  readonly JOC_TESTNET: '0x2761';
} & typeof CHAIN_IDS = {
  FLARE_MAINNET: '0xe',
  SONGBIRD_TESTNET: '0x13',
  APE_CHAIN_TESTNET: '0x8157',
  APE_CHAIN_MAINNET: '0x8173',
  GRAVITY_ALPHA_MAINNET: '0x659',
  KAIA_MAINNET: '0x2019',
  KAIA_KAIROS_TESTNET: '0x3e9',
  SONEIUM_MAINNET: '0x74c',
  SONEIUM_MINATO_TESTNET: '0x79a',
  XRPLEVM_TESTNET: '0x161c28',
  JOC_MAINNET: '0x51',
  JOC_TESTNET: '0x2761',
  ...CHAIN_IDS,
};

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
export const CustomNetworkImgMapping: Record<Hex, string> = {
  [NETWORK_CHAIN_ID.FLARE_MAINNET]: require('../../images/flare-mainnet.png'),
  [NETWORK_CHAIN_ID.SONGBIRD_TESTNET]: require('../../images/songbird.png'),
  [NETWORK_CHAIN_ID.APE_CHAIN_TESTNET]: require('../../images/ape-network.png'),
  [NETWORK_CHAIN_ID.APE_CHAIN_MAINNET]: require('../../images/ape-network.png'),
  [NETWORK_CHAIN_ID.GRAVITY_ALPHA_MAINNET]: require('../../images/gravity.png'),
  [NETWORK_CHAIN_ID.LINEA_MAINNET]: require('../../images/linea-mainnet-logo.png'),
  [NETWORK_CHAIN_ID.KAIA_MAINNET]: require('../../images/kaia.png'),
  [NETWORK_CHAIN_ID.KAIA_KAIROS_TESTNET]: require('../../images/kaia.png'),
  [NETWORK_CHAIN_ID.SONEIUM_MINATO_TESTNET]: require('../../images/soneium.png'),
  [NETWORK_CHAIN_ID.SONEIUM_MAINNET]: require('../../images/soneium.png'),
  [NETWORK_CHAIN_ID.XRPLEVM_TESTNET]: require('../../images/xrplevm.png'),
  [NETWORK_CHAIN_ID.JOC_MAINNET]: require('../../images/joc-mainnet-logo.png'),
  [NETWORK_CHAIN_ID.JOC_TESTNET]: require('../../images/joc-testnet-logo.png'),
};
