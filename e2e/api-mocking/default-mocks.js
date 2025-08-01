/**
 * Default mock responses for common MetaMask mobile endpoints
 * These are used as fallbacks when no specific mock is provided
 */

import { USER_STORAGE_MOCK_GET_ADDRESS_BOOK_RESPONSE } from './mock-responses/user-storage-responses';
import { getAuthMocks } from './mock-responses/auth-mocks';

// Get auth mocks
const authMocks = getAuthMocks();

export const DEFAULT_MOCKS = {
  GET: [
    // Auth mocks
    ...authMocks.GET,
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/scan?url=www.google.com',
      responseCode: 200,
      response: {
        domainName: 'google.com',
        recommendedAction: 'NONE',
        riskFactors: null,
        verified: true,
        status: 'COMPLETE',
      },
    },
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/scan?url=google.com',
      responseCode: 200,
      response: {
        domainName: 'google.com',
        recommendedAction: 'NONE',
        riskFactors: null,
        verified: true,
        status: 'COMPLETE',
      },
    },
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/scan?url=localhost',
      responseCode: 200,
      response: {
        domainName: 'localhost',
        recommendedAction: 'NONE',
        riskFactors: null,
        verified: true,
        status: 'COMPLETE',
      },
    },
    {
      urlEndpoint:
        'https://min-api.cryptocompare.com/data/pricemulti?fsyms=usd&tsyms=usd',
      responseCode: 200,
      response: {
        USD: {
          USD: 1,
        },
      },
    },
    {
      urlEndpoint:
        'https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH&tsyms=usd',
      responseCode: 200,
      response: {
        ETH: {
          USD: 3807.92,
        },
      },
    },
    {
      urlEndpoint: 'https://security-alerts.api.cx.metamask.io/validate/0x539',
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
        'https://user-storage.api.cx.metamask.io/api/v1/userstorage/addressBook',
      responseCode: 200,
      response: USER_STORAGE_MOCK_GET_ADDRESS_BOOK_RESPONSE,
    },
  ],
  POST: [
    // Auth mocks
    ...authMocks.POST,
    {
      urlEndpoint: 'https://api.segment.io/v1/track',
      responseCode: 200,
      response: {
        success: true,
      },
    },
    {
      urlEndpoint: 'https://api.mixpanel.com/track',
      responseCode: 200,
      response: {
        status: 1,
      },
    },
    {
      urlEndpoint: 'https://token-api.metaswap.codefi.network/tokens',
      responseCode: 200,
      response: [],
    },
    {
      urlEndpoint: 'https://security-alerts.api.cx.metamask.io/validate',
      responseCode: 200,
      response: {
        flagAsDangerous: 0,
      },
    },
  ],
  PUT: [],
  DELETE: [],
  PATCH: [],
};
