import { MockEventsObject } from '../../../framework';
import { TOKEN_API_TOKENS_RESPONSE } from '../token-api-responses.ts';

/**
 * Mock data for MetaMask token API endpoints used in E2E testing.
 * Covers token metadata and token lists for various networks.
 */

const tokenListRegex =
  /^https:\/\/token\.api\.cx\.metamask\.io\/tokens\/\d+\?.*$/;

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
