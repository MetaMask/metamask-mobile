/**
 * Default mock responses for common MetaMask mobile endpoints
 * These are used as fallbacks when no specific mock is provided
 */

import { DAPP_SCANNING_MOCKS } from './dapp-scanning';
import { PRICE_API_MOCKS } from './price-apis';
import { WEB_3_AUTH_MOCKS } from './web-3-auth';
import { DEFI_ADAPTERS_MOCKS } from './defi-adapter';
import { TOKEN_API_MOCKS } from './token-apis';
import { SWAP_API_MOCKS } from './swap-apis';
import { STAKING_MOCKS } from './staking';
import { WALLETCONNECT_MOCKS } from './walletconnect';
import { METAMETRICS_API_MOCKS } from './metametrics-test';
import { DEFAULT_ACCOUNTS_MOCK } from './accounts';
import { getAuthMocks } from '../auth-mocks';
import { USER_STORAGE_MOCK } from './user-storage';
import { DEFAULT_RAMPS_API_MOCKS } from './onramp-apis';
import { DEFAULT_GAS_API_MOCKS } from './gas-api';
import { DEFAULT_BRIDGE_API_MOCKS } from './bridge-api';
import { DEFAULT_IPFS_GATEWAY_MOCKS } from './ipfs-api';
import { DEFAULT_RPC_ENDPOINT_MOCKS } from './rpc-endpoints';
import { POLYMARKET_API_MOCKS } from './polymarket-apis';
import { INFURA_MOCKS } from '../infura-mocks';
import { CHAINS_NETWORK_MOCK_RESPONSE } from '../chains-network-mocks';
import { DEFAULT_REWARDS_MOCKS } from './rewards';
import { ACL_EXECUTION_MOCKS } from './acl-execution';
import { CONTENTFUL_BANNERS_MOCKS } from './contentful-banners';

// Get auth mocks
const authMocks = getAuthMocks();

export const DEFAULT_MOCKS = {
  GET: [
    ...(authMocks.GET || []),
    ...(DAPP_SCANNING_MOCKS.GET || []),
    ...(PRICE_API_MOCKS.GET || []),
    ...(WEB_3_AUTH_MOCKS.GET || []),
    ...(SWAP_API_MOCKS.GET || []),
    ...(STAKING_MOCKS.GET || []),
    ...(TOKEN_API_MOCKS.GET || []),
    ...(DEFI_ADAPTERS_MOCKS.GET || []),
    ...(DEFAULT_ACCOUNTS_MOCK.GET || []),
    ...(USER_STORAGE_MOCK.GET || []),
    ...(DEFAULT_RAMPS_API_MOCKS.GET || []),
    ...(DEFAULT_GAS_API_MOCKS.GET || []),
    ...(DEFAULT_BRIDGE_API_MOCKS.GET || []),
    ...(DEFAULT_IPFS_GATEWAY_MOCKS.GET || []),
    ...(POLYMARKET_API_MOCKS.GET || []),
    ...(INFURA_MOCKS.GET || []),
    ...(DEFAULT_REWARDS_MOCKS.GET || []),
    ...(ACL_EXECUTION_MOCKS.GET || []),
    ...(CONTENTFUL_BANNERS_MOCKS.GET || []),
    // Chains Network Mock - Provides blockchain network data
    {
      urlEndpoint: 'https://chainid.network/chains.json',
      responseCode: 200,
      response: CHAINS_NETWORK_MOCK_RESPONSE,
    },
    // Security Alerts Mock - Always responds with benign unless overridden by testSpecificMock
    {
      urlEndpoint:
        /^https:\/\/security-alerts\.api\.cx\.metamask\.io\/validate\/0x[a-fA-F0-9]+$/,
      responseCode: 200,
      response: {
        block: null,
        result_type: 'Benign',
        reason: '',
        description: '',
        features: [],
      },
    },
    {
      urlEndpoint:
        'https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/networks',
      responseCode: 200,
      response: {
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
          explorer: 'https://seitrace.com',
          confirmations: true,
          smartTransactions: false,
          relayTransactions: false,
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
          smartTransactions: true,
          relayTransactions: true,
          hidden: false,
          sendBundle: false,
        },
      },
    },
  ],
  POST: [
    ...(authMocks.POST || []),
    ...(WALLETCONNECT_MOCKS.POST || []),
    ...(METAMETRICS_API_MOCKS.POST || []),
    ...(DEFAULT_RPC_ENDPOINT_MOCKS.POST || []),
    ...(INFURA_MOCKS.POST || []),
    {
      urlEndpoint: 'https://api.mixpanel.com/track',
      responseCode: 200,
      response: {
        status: 1,
      },
    },
    {
      urlEndpoint: 'https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/',
      responseCode: 200,
      response: {},
    },
    {
      urlEndpoint: 'https://tx-sentinel-localhost.api.cx.metamask.io/',
      responseCode: 200,
      response: {},
    },
    {
      urlEndpoint: 'https://tx-sentinel-127.0.0.1.api.cx.metamask.io/',
      responseCode: 200,
      response: {},
    },
    {
      urlEndpoint:
        /^https:\/\/security-alerts\.api\.cx\.metamask\.io\/validate\/0x[a-fA-F0-9]+$/,
      responseCode: 200,
      response: {
        block: null,
        result_type: 'Benign',
        reason: '',
        description: '',
        features: [],
      },
    },
    ...(DEFAULT_REWARDS_MOCKS.POST || []),
  ],
  PUT: [...(USER_STORAGE_MOCK.PUT || [])],
  DELETE: [],
  PATCH: [],
};
