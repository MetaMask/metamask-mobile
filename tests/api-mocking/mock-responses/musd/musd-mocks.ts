/**
 * mUSD conversion E2E API mocks.
 * Sets up feature flags, geolocation, ramp tokens, price APIs, token API,
 * Merkl rewards, and Relay quote/status.
 */

import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../helpers/remoteFeatureFlagsHelper.ts';
import { setupMockRequest } from '../../helpers/mockHelpers.ts';
import { getDecodedProxiedURL } from '../../../smoke/notifications/utils/helpers.ts';
import {
  mockRelayQuoteMainnetMusd,
  mockRelayStatus,
} from '../transaction-pay.ts';
import { MUSD_MAINNET } from '../../../constants/musd-mainnet.ts';
import { MUSD_RAMP_TOKENS_RESPONSE } from './musd-ramp-tokens-response.ts';
import {
  MUSD_SPOT_PRICES_V3_RESPONSE,
  MUSD_CHAINS_SPOT_PRICES_V2_RESPONSE,
  MUSD_EXCHANGE_RATES_V1_RESPONSE,
  MUSD_HISTORICAL_PRICES_RESPONSE,
} from './musd-price-responses.ts';
import { MUSD_TOKEN_API_RESPONSE } from './musd-token-response.ts';

export async function setupMusdMocks(mockServer: Mockttp): Promise<void> {
  await setupRemoteFeatureFlagsMock(mockServer, {
    earnMusdConversionFlowEnabled: { enabled: true, minimumVersion: '0.0.0' },
    earnMusdCtaEnabled: { enabled: true, minimumVersion: '0.0.0' },
    earnMusdConversionTokenListItemCtaEnabled: {
      enabled: true,
      minimumVersion: '0.0.0',
    },
    earnMusdConversionAssetOverviewCtaEnabled: {
      enabled: true,
      minimumVersion: '0.0.0',
    },
    earnMusdConversionCtaTokens: { '*': ['USDC'] },
    earnMusdConvertibleTokensAllowlist: { '*': ['USDC'] },
    earnMusdConversionMinAssetBalanceRequired: 0.01,
    earnMusdConversionGeoBlockedCountries: { blockedRegions: ['GB'] },
  });

  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return /on-ramp\.(dev-api|uat-api|api)\.cx\.metamask\.io\/geolocation/.test(
        url,
      );
    })
    .asPriority(998)
    .thenCallback(() => ({
      statusCode: 200,
      body: 'US',
      headers: { 'content-type': 'text/plain' },
    }));

  await setupMockRequest(mockServer, {
    url: /on-ramp-cache\.(uat-api|api)\.cx\.metamask\.io\/regions\/.*\/tokens/,
    response: MUSD_RAMP_TOKENS_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v3\/spot-prices/,
    response: MUSD_SPOT_PRICES_V3_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v2\/chains\/\d+\/spot-prices/,
    response: MUSD_CHAINS_SPOT_PRICES_V2_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v1\/exchange-rates/,
    response: MUSD_EXCHANGE_RATES_V1_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v3\/historical-prices/,
    response: MUSD_HISTORICAL_PRICES_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: new RegExp(
      `token\\.api\\.cx\\.metamask\\.io/token/1\\?address=${MUSD_MAINNET}`,
      'i',
    ),
    response: MUSD_TOKEN_API_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /api\.merkl\.xyz\/v4\/users\/0x[a-fA-F0-9]+\/rewards\?chainId=/,
    response: [],
    requestMethod: 'GET',
    responseCode: 200,
  });

  await mockRelayQuoteMainnetMusd(mockServer);
  await mockRelayStatus(mockServer);
}
