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

// Get auth mocks
const authMocks = getAuthMocks();

export const DEFAULT_MOCKS = {
  GET: [
    ...authMocks.GET,
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
  ],
  POST: [
    ...authMocks.POST,
    ...(WALLETCONNECT_MOCKS.POST || []),
    ...(METAMETRICS_API_MOCKS.POST || []),
    {
      urlEndpoint: 'https://api.mixpanel.com/track',
      responseCode: 200,
      response: {
        status: 1,
      },
    },
  ],
  PUT: [...(USER_STORAGE_MOCK.PUT || [])],
  DELETE: [],
  PATCH: [],
};
