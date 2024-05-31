import { toHex } from '@metamask/controller-utils';

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

const PopularList = [
  {
    chainId: toHex('43114'),
    nickname: 'Avalanche Mainnet C-Chain',
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
    nickname: 'BNB Chain',
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
    nickname: 'Optimism',
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
    ticker: 'MATIC',
    rpcPrefs: {
      blockExplorerUrl: 'https://polygonscan.com',
      imageUrl: 'MATIC',
      imageSource: require('../../images/matic.png'),
    },
  },
  {
    chainId: toHex('324'),
    nickname: 'zkSync Era Mainnet',
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

export default PopularList;
