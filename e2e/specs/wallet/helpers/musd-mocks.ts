import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from '../../../../tests/api-mocking/helpers/mockHelpers';
import { getDecodedProxiedURL } from '../../notifications/utils/helpers';
import {
  mockRelayQuoteMainnetMusd,
  mockRelayStatus,
} from '../../../../tests/api-mocking/mock-responses/transaction-pay';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

/**
 * Sets up all API mocks required for mUSD conversion E2E tests: feature flags,
 * geolocation, ramp tokens, price APIs, token API, and Relay quote/status.
 */
export const setupMusdMocks = async (mockServer: Mockttp): Promise<void> => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    earnMusdConversionFlowEnabled: { enabled: true, minimumVersion: '0.0.0' },
    earnMusdCtaEnabled: { enabled: true, minimumVersion: '0.0.0' },
    earnMusdConversionTokenListItemCtaEnabled: {
      enabled: true,
      minimumVersion: '0.0.0',
    },
    // Asset Overview CTA (selector uses earnMusdConversionAssetOverviewCtaEnabled)
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
    response: {
      topTokens: [
        {
          assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
          chainId: 'eip155:1',
          symbol: 'MUSD',
          name: 'MetaMask USD',
          decimals: 6,
          tokenSupported: true,
        },
      ],
      allTokens: [
        {
          assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
          chainId: 'eip155:1',
          symbol: 'MUSD',
          name: 'MetaMask USD',
          decimals: 6,
          tokenSupported: true,
        },
        {
          assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          chainId: 'eip155:1',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          tokenSupported: true,
        },
      ],
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v3\/spot-prices/,
    response: {
      'eip155:1/slip44:60': {
        id: 'ethereum',
        price: 0.999904095987313,
        marketCap: 120707177.900275,
        allTimeHigh: 1.6514207089624,
        allTimeLow: 0.000144565964182697,
        totalVolume: 9910501.61509202,
        high1d: 1.01396406829944,
        low1d: 0.972789150571307,
        circulatingSupply: 120694373.7963051,
        dilutedMarketCap: 120707177.900275,
        marketCapPercentChange1d: 2.69249,
        priceChange1d: 77.51,
        pricePercentChange1h: -0.8412978033401519,
        pricePercentChange1d: 2.656997542645518,
        pricePercentChange7d: 2.280904394391741,
        pricePercentChange14d: -9.26474467228875,
        pricePercentChange30d: 2.3819062900759485,
        pricePercentChange200d: 1.9842726591642341,
        pricePercentChange1y: -5.689801242350527,
      },
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        id: 'usd-coin',
        price: 0.000333804977889164,
        marketCap: 23754743.4686059,
        allTimeHigh: 0.000390647532775852,
        allTimeLow: 0.000293034730938571,
        totalVolume: 4928178.91900057,
        high1d: 0.000333824677209193,
        low1d: 0.000333722507854467,
        circulatingSupply: 71166951334.28784,
        dilutedMarketCap: 23754727.3558976,
        marketCapPercentChange1d: -0.73791,
        priceChange1d: 0.00013626,
        pricePercentChange1h: 0.013840506207943954,
        pricePercentChange1d: 0.013630960582563337,
        pricePercentChange7d: -0.0009572939895655817,
        pricePercentChange14d: -0.00423420136358611,
        pricePercentChange30d: -0.000059529858641097485,
        pricePercentChange200d: -0.014687097277342517,
        pricePercentChange1y: -0.01926094991611645,
      },
      'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': {
        id: 'metamask-usd',
        price: 0.000333694127478155,
        marketCap: 7677.36891681464,
        allTimeHigh: 0.000362267156463077,
        allTimeLow: 0.000309008208387742,
        totalVolume: 4392.14336541057,
        high1d: 0.00035425387373947,
        low1d: 0.000333370591188189,
        circulatingSupply: 22999586.214533,
        dilutedMarketCap: 7677.36891681464,
        marketCapPercentChange1d: -7.9584,
        priceChange1d: -0.000168554433610746,
        pricePercentChange1h: -0.04427332716520257,
        pricePercentChange1d: -0.01686233770769416,
        pricePercentChange7d: 0.07342340725992479,
        pricePercentChange14d: -0.09041741955087122,
        pricePercentChange30d: -0.10435457604221866,
        pricePercentChange200d: null,
        pricePercentChange1y: null,
      },
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v2\/chains\/\d+\/spot-prices/,
    response: {
      '0x0000000000000000000000000000000000000000': {
        id: 'ethereum',
        price: 3000.0,
        pricePercentChange1d: 2.65,
      },
      [USDC_ADDRESS.toLowerCase()]: {
        id: 'usd-coin',
        price: 1.0,
        pricePercentChange1d: 0.01,
      },
      [MUSD_ADDRESS.toLowerCase()]: {
        id: 'metamask-usd',
        price: 1.0,
        pricePercentChange1d: -0.01,
      },
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v1\/exchange-rates/,
    response: {
      btc: {
        name: 'Bitcoin',
        ticker: 'btc',
        value: 0.0000112264812935107,
        currencyType: 'crypto',
      },
      eth: {
        name: 'Ether',
        ticker: 'eth',
        value: 0.000333886780150301,
        currencyType: 'crypto',
      },
      usd: { name: 'US Dollar', ticker: 'usd', value: 1, currencyType: 'fiat' },
      eur: {
        name: 'Euro',
        ticker: 'eur',
        value: 0.837579007063758,
        currencyType: 'fiat',
      },
      gbp: {
        name: 'British Pound Sterling',
        ticker: 'gbp',
        value: 0.726810998426553,
        currencyType: 'fiat',
      },
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v3\/historical-prices/,
    response: {
      prices: [
        [Date.now() - 86400000, 1.0],
        [Date.now() - 43200000, 1.0],
        [Date.now(), 1.0],
      ],
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /token\.api\.cx\.metamask\.io\/token\/1\?address=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
    response: {
      address: MUSD_ADDRESS,
      symbol: 'MUSD',
      name: 'MetaMask USD',
      decimals: 6,
      chainId: 1,
      logoURI: '',
      aggregators: [],
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  await mockRelayQuoteMainnetMusd(mockServer);
  await mockRelayStatus(mockServer);
};
