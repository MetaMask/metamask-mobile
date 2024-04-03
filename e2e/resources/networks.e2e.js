import { toHex } from '@metamask/controller-utils';

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;
const TENDERLY_KEY = process.env.TENDERLY_NETWORK_ID;

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
  Fantom: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('250'),
      rpcUrl: 'https://rpc.ftm.tools/',
      nickname: 'Fantom Opera',
      ticker: 'FTM',
    },
  },
  Harmony: {
    providerConfig: {
      type: 'rpc',
      chainId: toHex('1666600000'),
      rpcUrl: 'https://api.harmony.one/',
      nickname: 'Harmony Mainnet Shard 0',
      ticker: 'ONE',
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
      rpcUrl: 'https://eth.llamarpc.com',
      nickname: 'Ethereum Main Custom',
      ticker: 'ETH',
    },
  },
  Sepolia: {
    providerConfig: {
      type: 'mainnet',
      chainId: '11155111',
      rpcTarget: 'https://sepolia.infura.io/v3/',
      nickname: 'Sepolia Test Network',
      ticker: 'SepoliaETH',
    },
  },

  Tenderly: {
    isCustomNetwork: true,
    providerConfig: {
      type: 'rpc',
      chainId: '0x1',
      rpcUrl: `https://rpc.tenderly.co/fork/${TENDERLY_KEY}`,
      nickname: 'Tenderly',
      ticker: 'ETH',
    },
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
