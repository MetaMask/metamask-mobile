import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

export const PopularList = [
  {
    chainId: toHex('43114'),
    nickname: 'Avalanche C-Chain',
    rpcUrl: `https://avalanche-mainnet.infura.io/v3/${infuraProjectId}`,
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
    rpcUrl: `https://mainnet.base.org`,
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
    ticker: 'ETH',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.zksync.io/',
      imageUrl: 'ZK_SYNC',
      imageSource: require('../../images/zk-sync.png'),
    },
  },
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
} & typeof CHAIN_IDS = {
  FLARE_MAINNET: '0xe',
  SONGBIRD_TESTNET: '0x13',
  APE_CHAIN_TESTNET: '0x8157',
  APE_CHAIN_MAINNET: '0x8173',
  GRAVITY_ALPHA_MAINNET: '0x659',
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
};
