/**
 * Default mock responses for common MetaMask mobile endpoints
 * These are used as fallbacks when no specific mock is provided
 */

import { USER_STORAGE_MOCK_GET_ADDRESS_BOOK_RESPONSE } from './mock-responses/user-storage-responses';
import { getAuthMocks } from './mock-responses/auth-mocks';
import { SWAPS_FEATURE_FLAG_RESPONSE } from './mock-responses/feature-flags-mocks';
import {
  ACCOUNTS_API_ACTIVE_NETWORKS_RESPONSE,
  ACCOUNTS_API_TRANSACTIONS_RESPONSE,
  ACTIVE_NETWORKS_RESPONSE,
} from './mock-responses/accounts-api-responses';
import {
  POOLED_STAKING_VAULT_RESPONSE,
  STAKING_API_LENDING_RESPONSE,
} from './mock-responses/staking-api-responses-mocks';
import { TOKEN_API_TOKENS_RESPONSE } from './mock-responses/token-api-responses';

// Get auth mocks
const authMocks = getAuthMocks();

export const DEFAULT_MOCKS = {
  GET: [
    // Auth mocks
    ...authMocks.GET,
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/v2/scan?url=www.google.com',
      responseCode: 200,
      response: {
        domainName: 'google.com',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/v2/scan?url=google.com',
      responseCode: 200,
      response: {
        domainName: 'google.com',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/v2/scan?url=localhost',
      responseCode: 200,
      response: {
        domainName: 'localhost',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/v2/scan?url=verify.walletconnect.com',
      responseCode: 200,
      response: {
        domainName: 'verify.walletconnect.com',
        recommendedAction: 'NONE',
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
    {
      urlEndpoint:
        'https://authentication.api.cx.metamask.io/api/v2/nonce?identifier=0x030b4cfd21a0a0aca69b038e6d268f8eb83a8ea43610aabcd4ff6a19d13e0d10ba',
      responseCode: 200,
      response: {
        nonce: 'gxTzW7WWhXSLlbCg',
        identifier:
          '0x030b4cfd21a0a0aca69b038e6d268f8eb83a8ea43610aabcd4ff6a19d13e0d10ba',
        expires_in: 300,
      },
    },
    {
      urlEndpoint:
        'https://api.web3auth.io/fnd-service/node-details?network=sapphire_mainnet&verifier=auth-connection-id&verifierId=user-id&keyType=secp256k1&sigType=ecdsa-secp256k1',
      responseCode: 200,
      response: {
        nodeDetails: {
          currentEpoch: '1',
          torusNodeEndpoints: [
            'https://node-1.node.web3auth.io/sss/jrpc',
            'https://node-2.node.web3auth.io/sss/jrpc',
            'https://node-3.node.web3auth.io/sss/jrpc',
            'https://node-4.node.web3auth.io/sss/jrpc',
            'https://node-5.node.web3auth.io/sss/jrpc',
          ],
          torusNodeSSSEndpoints: [
            'https://node-1.node.web3auth.io/sss/jrpc',
            'https://node-2.node.web3auth.io/sss/jrpc',
            'https://node-3.node.web3auth.io/sss/jrpc',
            'https://node-4.node.web3auth.io/sss/jrpc',
            'https://node-5.node.web3auth.io/sss/jrpc',
          ],
          torusNodeRSSEndpoints: [
            'https://node-1.node.web3auth.io/rss',
            'https://node-2.node.web3auth.io/rss',
            'https://node-3.node.web3auth.io/rss',
            'https://node-4.node.web3auth.io/rss',
            'https://node-5.node.web3auth.io/rss',
          ],
          torusNodeTSSEndpoints: [
            'https://node-1.node.web3auth.io/tss',
            'https://node-2.node.web3auth.io/tss',
            'https://node-3.node.web3auth.io/tss',
            'https://node-4.node.web3auth.io/tss',
            'https://node-5.node.web3auth.io/tss',
          ],
          torusIndexes: [1, 2, 3, 4, 5],
          torusNodePub: [
            {
              X: 'e0925898fee0e9e941fdca7ee88deec99939ae9407e923535c4d4a3a3ff8b052',
              Y: '54b9fea924e3f3e40791f9987f4234ae4222412d65b74068032fa5d8b63375c1',
            },
            {
              X: '9124cf1e280aab32ba50dffd2de81cecabc13d82d2c1fe9de82f3b3523f9b637',
              Y: 'fca939a1ceb42ce745c55b21ef094f543b457630cb63a94ef4f1afeee2b1f107',
            },
            {
              X: '555f681a63d469cc6c3a58a97e29ebd277425f0e6159708e7c7bf05f18f89476',
              Y: '606f2bcc0884fa5b64366fc3e8362e4939841b56acd60d5f4553cf36b891ac4e',
            },
            {
              X: '2b5f58d8e340f1ab922e89b3a69a68930edfe51364644a456335e179bc130128',
              Y: '4b4daa05939426e3cbe7d08f0e773d2bf36f64c00d04620ee6df2a7af4d2247',
            },
            {
              X: '3ecbb6a68afe72cf34ec6c0a12b5cb78a0d2e83ba402983b6adbc5f36219861a',
              Y: 'dc1031c5cc8f0472bd521a62a64ebca9e163902c247bf05937daf4ae835091e4',
            },
          ],
        },
        success: true,
      },
    },
    {
      urlEndpoint: 'https://accounts.api.cx.metamask.io/v1/supportedNetworks',
      responseCode: 200,
      response: {
        fullSupport: [1, 137, 56, 59144, 8453, 10, 42161, 534352, 1329],
        partialSupport: { balances: [42220, 43114] },
      },
    },
    {
      urlEndpoint: 'https://swap.dev-api.cx.metamask.io/featureFlags',
      responseCode: 200,
      response: SWAPS_FEATURE_FLAG_RESPONSE,
    },
    {
      urlEndpoint:
        'https://accounts.api.cx.metamask.io/v2/activeNetworks?accountIds=eip155%3A0%3A0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
      responseCode: 200,
      response: ACCOUNTS_API_ACTIVE_NETWORKS_RESPONSE,
    },
    {
      urlEndpoint:
        'https://accounts.api.cx.metamask.io/v1/accounts/0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3/transactions?networks=0x1,0x89,0x38,0xe708,0x2105,0xa,0xa4b1,0x82750,0x531&sortDirection=DESC',
      responseCode: 200,
      response: ACCOUNTS_API_TRANSACTIONS_RESPONSE,
    },
    {
      urlEndpoint:
        'https://staking.api.cx.metamask.io/v1/pooled-staking/vault/1/apys?days=365&order=desc',
      responseCode: 200,
      response: POOLED_STAKING_VAULT_RESPONSE,
    },
    {
      urlEndpoint: 'https://staking.api.cx.metamask.io/v1/lending/markets',
      responseCode: 200,
      response: STAKING_API_LENDING_RESPONSE,
    },
    {
      urlEndpoint:
        'https://staking.api.cx.metamask.io/v1/pooled-staking/eligibility?addresses=0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
      responseCode: 200,
      response: { eligible: true },
    },
    {
      urlEndpoint:
        'https://staking.api.cx.metamask.io/v1/lending/positions/0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
      responseCode: 200,
      response: { positions: [] },
    },
    {
      urlEndpoint:
        'https://staking.api.cx.metamask.io/v1/pooled-staking/vault/1',
      responseCode: 200,
      response: {
        apy: '2.423922825407589424778761061946903',
        capacity:
          '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        feePercent: 1500,
        totalAssets: '34582364608391084442226',
        vaultAddress: '0x4fef9d741011476750a243ac70b9789a63dd47df',
      },
    },
    {
      urlEndpoint:
        'https://staking.api.cx.metamask.io/v1/pooled-staking/vault/1/apys/averages',
      responseCode: 200,
      response: {
        oneDay: '2.160630689308144746',
        oneWeek: '2.42203859587349324429',
        oneMonth: '2.49056583176788989407',
        threeMonths: '2.52669759044094515534',
        sixMonths: '2.65550671135719381941',
        oneYear: '2.6612714152041561994',
      },
    },
    {
      urlEndpoint:
        'https://staking.api.cx.metamask.io/v1/pooled-staking/stakes/1?accounts=0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
      responseCode: 200,
      response: {
        accounts: [
          {
            account: '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
            lifetimeRewards: '0',
            assets: '0',
            exitRequests: [],
          },
        ],
        exchangeRate: '1.034162108591709262',
      },
    },
    {
      urlEndpoint: 'https://on-ramp.api.cx.metamask.io/geolocation',
      responseCode: 200,
      response: 'US',
    },
    {
      urlEndpoint:
        'https://token.api.cx.metamask.io/tokens/1337?occurrenceFloor=3&includeNativeAssets=false&includeTokenFees=false&includeAssetType=false&includeERC20Permit=false&includeStorage=false',
      responseCode: 200,
      response: TOKEN_API_TOKENS_RESPONSE,
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
    {
      urlEndpoint:
        'https://pulse.walletconnect.org/batch?projectId=017a80231854c3b1c56df7bb46bba859&st=events_sdk&sv=js-2.19.2&sp=desktop',
      responseCode: 200,
      response: {},
    },
  ],
  PUT: [],
  DELETE: [],
  PATCH: [],
};
