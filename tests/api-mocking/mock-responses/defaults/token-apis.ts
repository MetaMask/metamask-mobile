import { MockEventsObject } from '../../../framework';
import { TOKEN_API_TOKENS_RESPONSE } from '../token-api-responses.ts';
import { MUSD_TOKEN_API_RESPONSE } from '../musd/musd-token-response.ts';

/**
 * Mock data for MetaMask token API endpoints used in E2E testing.
 * Covers token metadata and token lists for various networks.
 */

const tokenListRegex =
  /^https:\/\/token\.api\.cx\.metamask\.io\/tokens\/\d+\?.*$/;

// Single-token metadata: /token/{chainId}?address=0x...
// The controller fetches this for any token the app encounters (swap quotes,
// bridge destinations, etc.). Without a default mock every test that triggers
// the request must add its own — and missing ones cause validateLiveRequests
// failures. Return a minimal valid response so tests don't break.
const singleTokenMetadataRegex =
  /^https:\/\/token\.api\.cx\.metamask\.io\/token\/\d+\?address=0x[a-fA-F0-9]+/;

const tokenAssetsRegex =
  /^https:\/\/token\.api\.cx\.metamask\.io\/assets\?assetIds=.*&includeTokenSecurityData=true$/;

// Matches the v3 assets endpoint used by useERC20Tokens to fetch token metadata
// e.g. https://tokens.api.cx.metamask.io/v3/assets?assetIds=eip155:1/erc20:0x...&includeIconUrl=true
const tokenV3AssetsRegex =
  /^https:\/\/tokens\.api\.cx\.metamask\.io\/v3\/assets\?.*$/;

// OHLCV advanced chart (useOHLCVChart) — path includes CAIP asset id, e.g.
// https://price.api.cx.metamask.io/v3/ohlcv-chart/eip155:8453/erc20:0x...?timePeriod=1d&vsCurrency=usd
const ohlcvChartRegex =
  /^https:\/\/price\.api\.cx\.metamask\.io\/v3\/ohlcv-chart\/.+$/;

const OHLCV_CHART_EMPTY_RESPONSE = {
  data: [],
  hasNext: false,
  nextCursor: '',
};
// Matches the single-token metadata endpoint triggered by TokensController.addToken()
// when useEnsureMusdTokenRegistered registers mUSD at app startup for all supported chains.
// Scoped to the mUSD token address (0xaca92e438df0b2401ff60da7e4337b687a2435da) so that
// unrelated token-by-address lookups are NOT matched and continue to resolve normally.
// e.g. https://token.api.cx.metamask.io/token/1?address=0xaca92e438df0b2401ff60da7e4337b687a2435da&includeRwaData=true
//      https://token.api.cx.metamask.io/token/59144?address=0xaca92e438df0b2401ff60da7e4337b687a2435da&includeRwaData=true
const musdTokenByAddressRegex =
  /^https:\/\/token\.api\.cx\.metamask\.io\/token\/\d+\?.*address=0xaca92e438df0b2401ff60da7e4337b687a2435da.*$/i;

export const TOKEN_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint: tokenListRegex,
      responseCode: 200,
      response: TOKEN_API_TOKENS_RESPONSE,
    },
    {
      urlEndpoint: singleTokenMetadataRegex,
      responseCode: 200,
      response: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'TOKEN',
        decimals: 18,
        occurrences: 1,
        aggregators: [],
        name: 'Mock Token',
        iconUrl: '',
      },
    },
    {
      urlEndpoint: tokenAssetsRegex,
      responseCode: 200,
      response: [],
    },
    {
      urlEndpoint: tokenV3AssetsRegex,
      responseCode: 200,
      response: [],
    },
    {
      urlEndpoint: ohlcvChartRegex,
      responseCode: 200,
      response: OHLCV_CHART_EMPTY_RESPONSE,
    },
    {
      urlEndpoint: musdTokenByAddressRegex,
      responseCode: 200,
      response: MUSD_TOKEN_API_RESPONSE,
    },
  ],
};
