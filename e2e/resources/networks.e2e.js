import { toHex } from '@metamask/controller-utils';

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

const PopularNetworksList = {
  Avalanche: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('43114'),
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      nickname: 'Avalanche Mainnet C-Chain',
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
      rpcUrl: `https://mainnet.base.org`,
      nickname: 'Base',
      ticker: 'ETH',
    },
  },
  Optimism: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('10'),
      rpcUrl: `https://optimism-mainnet.infura.io/v3/${infuraProjectId}`,
      nickname: 'Optimism',
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

  Tenderly: {
    Mainnet: {
      isCustomNetwork: true,
      providerConfig: {
        type: 'rpc',
        chainId: toHex('1'),
        rpcUrl: 'https://virtual.mainnet.rpc.tenderly.co/6c80ca53-d96a-49e8-967d-e184bb51d325',
        nickname: 'Tenderly - Mainnet',
        ticker: 'ETH',
     },
    },
    Arbitrum: {
      isCustomNetwork: false,
      providerConfig: {
        type: 'rpc',
        chainId: toHex('42161'),
        rpcUrl: 'https://virtual.arbitrum.rpc.tenderly.co/903b3e51-8d9b-4ced-b594-d1ee6b99681c',
        nickname: 'Arbitrum',
        ticker: 'ETH',
      },
    },
    Optimism: {
      isCustomNetwork: false,
      providerConfig: {
        type: 'rpc',
        chainId: toHex('10'),
        rpcUrl: 'https://virtual.optimism.rpc.tenderly.co/8a89a4ef-a0b6-4c79-86bb-6a7ed56be4bc',
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
    },
  },
};
export { CustomNetworks, PopularNetworksList };
