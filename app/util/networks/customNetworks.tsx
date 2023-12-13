/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

const PopularList = [
  {
    chainId: '0xa86a',
    nickname: 'Avalanche Mainnet C-Chain',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    ticker: 'AVAX',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://snowtrace.io',
      imageUrl: 'AVAX',
      imageSource: require('../../images/avalanche.png'),
    },
  },
  {
    chainId: '0xa4b1',
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
    chainId: '0x38',
    nickname: 'BNB Smart Chain',
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
    chainId: '250',
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
    chainId: '0x63564c40',
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
  {
    chainId: '0xa',
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
    chainId: '0x89',
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
    chainId: '0x2a15c308d',
    nickname: 'Palm',
    rpcUrl: `https://palm-mainnet.infura.io/v3/${infuraProjectId}`,
    ticker: 'PALM',
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.palm.io',
      imageUrl: 'PALM',
      imageSource: require('../../images/palm.png'),
    },
  },
];

export default PopularList;
