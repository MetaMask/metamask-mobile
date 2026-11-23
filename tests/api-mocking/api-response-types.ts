/**
 * Maps each mocked HTTP API to the TypeScript type the wallet (or the
 * controller/service that calls it) uses to consume the response.
 *
 * E2E mocks annotate their bodies with `satisfies <type>`, so `yarn lint:tsc`
 * fails when a mock drifts from the type the app reads. Only exported types
 * are used here. When a package exports no type for an endpoint, the mock is
 * left untyped and listed as such in `api-mock-catalog.md`.
 *
 * Types are re-exported under an `<Api><Endpoint>Response` name so a mock reads
 * as "this is what `<endpoint>` returns".
 */
import type {
  CoinGeckoSpotPrice,
  PriceV2SupportedNetworksResponse,
  TokenV2SupportedNetworksResponse,
  V1AccountTransactionsResponse,
  V1ExchangeRatesResponse,
  V1HistoricalPricesResponse,
  V1SuggestedOccurrenceFloorsResponse,
  V2ActiveNetworksResponse,
  V2AssetResponse,
  V2BalancesResponse,
  V2SupportedNetworksResponse,
  V3AssetResponse,
  V3HistoricalPricesResponse,
  V4BalancesResponse,
  V5BalancesResponse,
  V5MultiAccountTransactionsResponse,
  V6BalancesResponse,
} from '@metamask/core-backend';
import type { TokenListToken } from '@metamask/assets-controllers';
import type { BridgeAsset, QuoteResponse } from '@metamask/bridge-controller';
import type { StatusResponse } from '@metamask/bridge-status-controller';
import type { GasFeeEstimates } from '@metamask/gas-fee-controller';
import type { Country } from '@metamask/ramps-controller';
import type { EntryCollection } from 'contentful';
import type { ContentfulSlideSkeleton } from '../../app/components/UI/Carousel/fetchCarouselSlidesFromContentful';

/** `price.api` `GET /v3/spot-prices` (with market data), keyed by CAIP-19 asset id. */
export type PriceSpotPricesV3Response = Record<string, CoinGeckoSpotPrice>;

/** `price.api` `GET /v1/exchange-rates`. */
export type PriceExchangeRatesV1Response = V1ExchangeRatesResponse;

/** `price.api` `GET /v2/supportedNetworks`. */
export type PriceSupportedNetworksV2Response = PriceV2SupportedNetworksResponse;

/**
 * `price.api` `GET /v1/chains/:chainId/historical-prices/:address`. The API
 * also sends `marketCaps` and `totalVolumes`, which `V1HistoricalPricesResponse`
 * does not declare.
 */
export type PriceHistoricalPricesV1Response = V1HistoricalPricesResponse &
  Pick<V3HistoricalPricesResponse, 'marketCaps' | 'totalVolumes'>;

/** `accounts.api` `GET /v2/accounts/:address/balances`. */
export type AccountsBalancesV2Response = V2BalancesResponse;

/** `accounts.api` `GET /v4/multiaccount/balances`. */
export type AccountsMultiaccountBalancesV4Response = V4BalancesResponse;

/** `accounts.api` `GET /v5/multiaccount/balances`. */
export type AccountsMultiaccountBalancesV5Response = V5BalancesResponse;

/** `accounts.api` `GET /v6/multiaccount/balances`. */
export type AccountsMultiaccountBalancesV6Response = V6BalancesResponse;

/** `accounts.api` `GET /v2/supportedNetworks`. */
export type AccountsSupportedNetworksV2Response = V2SupportedNetworksResponse;

/** `accounts.api` `GET /v2/activeNetworks`. */
export type AccountsActiveNetworksV2Response = V2ActiveNetworksResponse;

/** `accounts.api` `GET /v1/accounts/:address/transactions`. */
export type AccountsTransactionsV1Response = V1AccountTransactionsResponse;

/** `accounts.api` `GET /v5/multiaccount/transactions`. */
export type AccountsMultiaccountTransactionsV5Response =
  V5MultiAccountTransactionsResponse;

/** `tokens.api` `GET /v3/assets`. */
export type TokensAssetsV3Response = V3AssetResponse[];

/** `token.api` `GET /v2/assets`. */
export type TokenAssetsV2Response = V2AssetResponse[];

/** `token.api` `GET /v2/supportedNetworks`. */
export type TokenSupportedNetworksV2Response = TokenV2SupportedNetworksResponse;

/** `token.api` `GET /v1/suggestedOccurrenceFloors`. */
export type TokenSuggestedOccurrenceFloorsV1Response =
  V1SuggestedOccurrenceFloorsResponse;

/** `token.api` `GET /tokens/:chainId` (read by `TokenListController`). */
export type TokenListResponse = TokenListToken[];

/**
 * `bridge.api` `GET /getTokens`. The API also sends these fields, which
 * `BridgeAssetSchema` does not validate.
 */
export type BridgeGetTokensResponse = (BridgeAsset & {
  coingeckoId?: string;
  aggregators?: string[];
  occurrences?: number;
  metadata?: Record<string, unknown>;
})[];

/** `bridge.api` `GET /getTxStatus`. */
export type BridgeGetTxStatusResponse = StatusResponse;

/** `bridge.api` `GET /getQuote`, as consumed by `BridgeController`. */
export type BridgeGetQuoteResponse = QuoteResponse[];

/**
 * `gas.api` `GET /networks/:chainId/suggestedGasFees`. The API also sends
 * `version`, which `fetchGasEstimates` ignores.
 */
export type GasSuggestedGasFeesResponse = GasFeeEstimates & {
  version?: string;
};

/**
 * `on-ramp-cache.api` `GET /v2/regions/countries`, read by
 * `RampsService.getCountries()`.
 */
export type RampsCountriesV2Response = Country[];

/**
 * Contentful `promotionalBanner` entries, read by
 * `fetchCarouselSlidesFromContentful`. The REST API sends a collection `sys`
 * of `{ type: 'Array' }`, which the SDK types as an entity `sys` instead.
 */
export type ContentfulBannersResponse = Omit<
  EntryCollection<ContentfulSlideSkeleton>,
  'sys'
> & { sys: { type: 'Array' } };
