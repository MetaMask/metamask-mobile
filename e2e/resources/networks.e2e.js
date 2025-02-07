import { BlockExplorerUrl, toHex } from '@metamask/controller-utils';

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

const PopularNetworksList = {
  Avalanche: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('43114'),
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      nickname: 'Avalanche C-Chain',
      ticker: 'AVAX',
    },
  },
  BNB: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('56'),
      rpcUrl: 'https://bsc-dataseed.binance.org/',
      nickname: 'BNB Smart Chain',
      ticker: 'BNB',
    },
  },
  zkSync: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('324'),
      rpcUrl: `https://mainnet.era.zksync.io`,
      nickname: 'zkSync Era Mainnet',
      ticker: 'FTM',
    },
  },
  Base: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('8453'),
      rpcUrl: `https://base-mainnet.infura.io/v3/${infuraProjectId}`,
      nickname: 'Base',
      ticker: 'ETH',
    },
  },
  Optimism: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('10'),
      rpcUrl: `https://optimism-mainnet.infura.io/v3/${infuraProjectId}`,
      nickname: 'OP Mainnet',
      ticker: 'ETH',
    },
  },
  Polygon: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('137'),
      rpcUrl: `https://polygon-mainnet.infura.io/v3/${infuraProjectId}`,
      nickname: 'Polygon Mainnet',
      ticker: 'MATIC',
    },
  },
  Palm: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('11297108109'),
      rpcUrl: `https://palm-mainnet.infura.io/v3/${infuraProjectId}`,
      nickname: 'Palm',
      ticker: 'PALM',
    },
  },
};

const CustomNetworks = {
  EthereumMainCustom: {
    providerConfig: {
      type: 'rpc',
      chainId: '0x1',
      rpcUrlInvalid: 'https//rpc.mevblocker.io',
      rpcUrl: 'https://eth.llamarpc.com',
      rpcUrlAlt: 'https://rpc.mevblocker.io',
      nickname: 'Ethereum Main Custom',
      ticker: 'ETH',
    },
  },
  Sepolia: {
    providerConfig: {
      type: 'rpc',
      chainId: '0xaa36a7',
      rpcTarget: `https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161`,
      nickname: 'Sepolia',
      ticker: 'SepoliaETH',
    },
  },
  ElysiumTestnet: {
    providerConfig: {
      type: 'rpc',
      chainId: '0x53a',
      rpcUrlInvalid: 'https://rpc.atlantischain.network',
      rpcUrl: 'https://rpc.atlantischain.network',
      rpcUrlAlt: 'https://rpc.atlantischain.network',
      nickname: 'Elysium Testnet',
      ticker: 'LAVA',
    },
  },
  Tenderly: {
    Mainnet: {
      providerConfig: {
        type: 'rpc',
        chainId: toHex('1'),
        rpcUrl: 'https://virtual.mainnet.rpc.tenderly.co/3472e4b3-594b-488a-a8b1-93593194615f',
        nickname: 'Tenderly - Mainnet',
        ticker: 'ETH',
     },
    },
    Polygon: {
      providerConfig: {
        type: 'rpc',
        chainId: toHex('137'),
        rpcUrl: 'https://virtual.polygon.rpc.tenderly.co/e834a81e-69ba-49e9-a6a5-be5b6eea3cdc',
        nickname: 'Polygon',
        ticker: 'POL',
      },
    },
    Linea: {
      providerConfig: {
        type: 'rpc',
        chainId: toHex('59144'),
        rpcUrl: 'https://virtual.linea.rpc.tenderly.co/2c429ceb-43db-45bc-9d84-21a40d21e0d2',
        nickname: 'Linea',
        ticker: 'ETH',
      },
    },
    Optimism: {
      providerConfig: {
        type: 'rpc',
        chainId: toHex('10'),
        rpcUrl: 'https://virtual.optimism.rpc.tenderly.co/3170a58e-fa67-4ccc-9697-b13aff0f5c1a',
        nickname: 'Optimism',
        ticker: 'ETH',
      },
    }
  },
  Gnosis: {
    providerConfig: {
      type: 'rpc',
      chainId: '100',
      rpcUrl: 'https://rpc.gnosischain.com',
      nickname: 'Gnosis',
      ticker: 'xDAI',
      BlockExplorerUrl: 'https://gnosisscan.io',
    },
  },
  Holesky: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex(17000),
      rpcUrl: 'https://ethereum-holesky.publicnode.com',
      nickname: 'Holesky',
      ticker: 'ETH',
      walletName: 'Ethereum',
      BlockExplorerUrl: 'https://holesky.etherscan.io/',
    },
  },
};
export { CustomNetworks, PopularNetworksList };
