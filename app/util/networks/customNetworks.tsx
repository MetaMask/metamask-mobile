const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

const PopularList = [
  {
    chainId: '43114',
    nickname: 'Avalanche Mainnet C-Chain',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    ticker: 'AVAX',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://snowtrace.io',
      imageUrl: 'AVAX',
    },
  },
  {
    chainId: '42161',
    nickname: 'Arbitrum One',
    rpcUrl: `https://arbitrum-mainnet.infura.io/v3/${infuraProjectId}`,
    ticker: 'ETH',
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.arbitrum.io',
      imageUrl: 'AETH',
    },
  },
  {
    chainId: '56',
    nickname: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    ticker: 'BNB',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://bscscan.com',
      imageUrl: 'BNB',
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
    },
  },
  {
    chainId: '1666600000',
    nickname: 'Harmony Mainnet Shard 0',
    rpcUrl: 'https://api.harmony.one/',
    ticker: 'ONE',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.harmony.one',
      imageUrl: 'ONE',
    },
  },
  {
    chainId: '10',
    nickname: 'Optimism',
    rpcUrl: `https://optimism-mainnet.infura.io/v3/${infuraProjectId}`,
    ticker: 'ETH',
    rpcPrefs: {
      blockExplorerUrl: 'https://optimistic.etherscan.io',
      imageUrl: 'OPTIMISM',
    },
  },
  {
    chainId: '137',
    nickname: 'Polygon Mainnet',
    rpcUrl: `https://polygon-mainnet.infura.io/v3/${infuraProjectId}`,
    ticker: 'MATIC',
    rpcPrefs: {
      blockExplorerUrl: 'https://polygonscan.com',
      imageUrl: 'MATIC',
    },
  },
  {
    chainId: '11297108109',
    nickname: 'Palm',
    rpcUrl: `https://palm-mainnet.infura.io/v3/${infuraProjectId}`,
    ticker: 'PALM',
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.palm.io',
      imageUrl: 'PALM',
    },
  },
  {
    chainId: '3',
    nickname: 'Ropsten Test Network',
    rpcUrl: 'https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    ticker: 'ETH',
    color: '#ff4a8d',
    rpcPrefs: {
      blockExplorerUrl: 'https://ropsten.etherscan.io',
    },
  },
  {
    chainId: '42',
    nickname: 'Kovan Test Network',
    rpcUrl: 'https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    ticker: 'ETH',
    color: '#7057ff',
    rpcPrefs: {
      blockExplorerUrl: 'https://kovan.etherscan.io',
    },
  },
  {
    chainId: '4',
    nickname: 'Rinkeby Test Network',
    rpcUrl: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    ticker: 'ETH',
    color: '#f6c343',
    rpcPrefs: {
      blockExplorerUrl: 'https://rinkeby.etherscan.io',
    },
  },
];

export default PopularList;
