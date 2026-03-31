import { MockEventsObject } from '../../../framework';
import { TOKEN_API_TOKENS_RESPONSE } from '../token-api-responses.ts';

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
        occurences: 1,
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
  ],
};
