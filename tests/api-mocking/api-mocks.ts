/**
 * Endpoint definitions for the APIs typed in `api-response-types.ts`. Each
 * endpoint is defined once (id, matcher, typed default body) and specs build
 * their `testSpecificMock` from it with `endpoint.mock(overrides, params)`, so
 * a spec mock is checked against the same consumer type as the default and
 * starts from the same synced body. See `api-mock-catalog.md`.
 *
 * The default body is the one `DEFAULT_MOCKS` serves (or its empty equivalent
 * when the default is request-specific). Defining an endpoint here never
 * changes what the default mocks serve.
 */
import { defineApiMock } from './define-api-mock.ts';
import type {
  AccountsActiveNetworksV2Response,
  AccountsBalancesV2Response,
  AccountsMultiaccountBalancesV4Response,
  AccountsMultiaccountBalancesV5Response,
  AccountsMultiaccountBalancesV6Response,
  AccountsSupportedNetworksV2Response,
  BridgeGetTokensResponse,
  BridgeGetTxStatusResponse,
  ContentfulBannersResponse,
  GasSuggestedGasFeesResponse,
  PriceExchangeRatesV1Response,
  PriceSpotPricesV3Response,
  RampsCountriesV2Response,
  TokenSupportedNetworksV2Response,
  TokensAssetsV3Response,
} from './api-response-types.ts';
import { ACCOUNTS_SUPPORTED_NETWORKS_V2 } from './mock-responses/synced/accounts-supported-networks-v2.ts';
import { GAS_FEES_RESPONSE } from './mock-responses/synced/gas-suggested-gas-fees.ts';
import { PRICE_EXCHANGE_RATES_V1 } from './mock-responses/synced/price-exchange-rates-v1.ts';
import { PRICE_SPOT_PRICES_V3 } from './mock-responses/synced/price-spot-prices-v3.ts';
import { TOKEN_SUPPORTED_NETWORKS_V2 } from './mock-responses/synced/token-supported-networks-v2.ts';
import {
  ACCOUNTS_API_ACTIVE_NETWORKS_RESPONSE,
  ACCOUNTS_API_BALANCES_V2_RESPONSE,
  ACCOUNTS_API_BALANCES_V4_RESPONSE,
  ACCOUNTS_API_BALANCES_V5_RESPONSE,
  ACCOUNTS_API_BALANCES_V6_RESPONSE,
} from './mock-responses/defaults/accounts.ts';
import {
  BRIDGE_TOKEN_DETAILS_CHAIN_1,
  BRIDGE_TX_STATUS_PENDING,
} from './mock-responses/defaults/bridge-api.ts';
import { RAMPS_COUNTRIES_RESPONSE } from './mock-responses/ramps/responses/ramps-countries-response.ts';

const EMPTY_CONTENTFUL_BANNERS = {
  sys: { type: 'Array' },
  total: 0,
  skip: 0,
  limit: 100,
  items: [],
  includes: { Asset: [] },
} satisfies ContentfulBannersResponse;

export const priceSpotPricesV3 = defineApiMock<PriceSpotPricesV3Response>({
  id: 'price-v3-spot-prices',
  url: /^https:\/\/price\.api\.cx\.metamask\.io\/v3\/spot-prices(\?.*)?$/,
  body: PRICE_SPOT_PRICES_V3,
});

export const priceExchangeRatesV1 = defineApiMock<PriceExchangeRatesV1Response>(
  {
    id: 'price-v1-exchange-rates',
    url: /^https:\/\/price\.api\.cx\.metamask\.io\/v1\/exchange-rates(\?.*)?$/,
    body: PRICE_EXCHANGE_RATES_V1,
  },
);

export const accountsSupportedNetworksV2 =
  defineApiMock<AccountsSupportedNetworksV2Response>({
    id: 'accounts-v2-supported-networks',
    url: /^https:\/\/accounts\.api\.cx\.metamask\.io\/v2\/supportedNetworks(\?.*)?$/,
    body: ACCOUNTS_SUPPORTED_NETWORKS_V2,
  });

export const accountsActiveNetworksV2 =
  defineApiMock<AccountsActiveNetworksV2Response>({
    id: 'accounts-v2-active-networks',
    url: /^https:\/\/accounts\.api\.cx\.metamask\.io\/v2\/activeNetworks(\?.*)?$/,
    body: ACCOUNTS_API_ACTIVE_NETWORKS_RESPONSE,
  });

export const accountsBalancesV2 = defineApiMock<AccountsBalancesV2Response>({
  id: 'accounts-v2-balances',
  url: /^https:\/\/accounts\.api\.cx\.metamask\.io\/v2\/accounts\/[^/]+\/balances(\?.*)?$/,
  body: ACCOUNTS_API_BALANCES_V2_RESPONSE,
});

export const accountsMultiaccountBalancesV4 =
  defineApiMock<AccountsMultiaccountBalancesV4Response>({
    id: 'accounts-v4-multiaccount-balances',
    url: /^https:\/\/accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/balances(\?.*)?$/,
    body: ACCOUNTS_API_BALANCES_V4_RESPONSE,
  });

export const accountsMultiaccountBalancesV5 =
  defineApiMock<AccountsMultiaccountBalancesV5Response>({
    id: 'accounts-v5-multiaccount-balances',
    url: /^https:\/\/accounts\.api\.cx\.metamask\.io\/v5\/multiaccount\/balances(\?.*)?$/,
    body: ACCOUNTS_API_BALANCES_V5_RESPONSE,
  });

export const accountsMultiaccountBalancesV6 =
  defineApiMock<AccountsMultiaccountBalancesV6Response>({
    id: 'accounts-v6-multiaccount-balances',
    url: /^https:\/\/accounts\.api\.cx\.metamask\.io\/v6\/multiaccount\/balances(\?.*)?$/,
    body: ACCOUNTS_API_BALANCES_V6_RESPONSE,
  });

export const tokenSupportedNetworksV2 =
  defineApiMock<TokenSupportedNetworksV2Response>({
    id: 'token-v2-supported-networks',
    url: /^https:\/\/tokens\.api\.cx\.metamask\.io\/v2\/supportedNetworks(\?.*)?$/,
    body: TOKEN_SUPPORTED_NETWORKS_V2,
  });

/**
 * The default body is empty because the response depends on `assetIds`. Pass
 * `{ assetIds }` to match one request; the string is matched as a substring of
 * the proxied URL, so keep the casing the app sends.
 */
export const tokensAssetsV3 = defineApiMock<
  TokensAssetsV3Response,
  { assetIds: string }
>({
  id: 'tokens-v3-assets',
  url: /^https:\/\/tokens\.api\.cx\.metamask\.io\/v3\/assets\?.*$/,
  urlFor: ({ assetIds }) =>
    `https://tokens.api.cx.metamask.io/v3/assets?assetIds=${assetIds}`,
  body: [],
});

/** Default body is the curated chain 1 list; pass `{ chainId }` to match one chain. */
export const bridgeGetTokens = defineApiMock<
  BridgeGetTokensResponse,
  { chainId: number | string }
>({
  id: 'bridge-get-tokens',
  url: /^https:\/\/bridge\.(api|dev-api)\.cx\.metamask\.io\/getTokens\?chainId=\d+(&.*)?$/,
  urlFor: ({ chainId }) =>
    new RegExp(
      String.raw`^https:\/\/bridge\.(api|dev-api)\.cx\.metamask\.io\/getTokens\?chainId=${chainId}(&.*)?$`,
    ),
  body: BRIDGE_TOKEN_DETAILS_CHAIN_1,
});

export const bridgeGetTxStatus = defineApiMock<BridgeGetTxStatusResponse>({
  id: 'bridge-get-tx-status',
  url: /^https:\/\/bridge\.(api|dev-api)\.cx\.metamask\.io\/getTxStatus(\?.*)?$/,
  body: BRIDGE_TX_STATUS_PENDING,
});

export const gasSuggestedGasFees = defineApiMock<
  GasSuggestedGasFeesResponse,
  { chainId: number }
>({
  id: 'gas-suggested-gas-fees',
  url: /^https:\/\/gas\.api\.cx\.metamask\.io\/networks\/\d+\/suggestedGasFees(\?.*)?$/,
  urlFor: ({ chainId }) =>
    new RegExp(
      String.raw`^https:\/\/gas\.api\.cx\.metamask\.io\/networks\/${chainId}\/suggestedGasFees(\?.*)?$`,
    ),
  body: GAS_FEES_RESPONSE,
});

/**
 * The default country list is the 5-country subset specs select from. Only
 * `/v2/regions/countries` has this shape; the legacy aggregator and deposit
 * routes have their own fixtures.
 */
export const rampsCountriesV2 = defineApiMock<RampsCountriesV2Response>({
  id: 'ramps-v2-countries',
  url: /^https:\/\/on-ramp-cache\.(api|dev-api|uat-api)\.cx\.metamask\.io\/v2\/regions\/countries(\?.*)?$/,
  body: RAMPS_COUNTRIES_RESPONSE,
});

export const contentfulBanners = defineApiMock<ContentfulBannersResponse>({
  id: 'contentful-promotional-banners',
  url: /contentful\.com.*(promotionalBanner|showInMobile.*true)/,
  body: EMPTY_CONTENTFUL_BANNERS,
});

/**
 * Every endpoint above, keyed by id, for the guard test and the catalog.
 */
export const API_MOCKS = {
  priceSpotPricesV3,
  priceExchangeRatesV1,
  accountsSupportedNetworksV2,
  accountsActiveNetworksV2,
  accountsBalancesV2,
  accountsMultiaccountBalancesV4,
  accountsMultiaccountBalancesV5,
  accountsMultiaccountBalancesV6,
  tokenSupportedNetworksV2,
  tokensAssetsV3,
  bridgeGetTokens,
  bridgeGetTxStatus,
  gasSuggestedGasFees,
  rampsCountriesV2,
  contentfulBanners,
};

/**
 * A spot price entry with only the fields the controllers read (`id`,
 * `price`). Use it inside `priceSpotPricesV3.mock(() => ({ ... }))`.
 *
 * @param assetId - CAIP-19 asset id.
 * @param price - Price in the requested currency.
 */
export const spotPrice = (
  assetId: string,
  price: number,
): PriceSpotPricesV3Response[string] => ({ id: assetId, price });
