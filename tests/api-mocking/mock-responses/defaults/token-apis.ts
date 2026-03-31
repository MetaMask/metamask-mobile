import { MockEventsObject } from '../../../framework';
import { TOKEN_API_TOKENS_RESPONSE } from '../token-api-responses.ts';
import { MUSD_TOKEN_API_RESPONSE } from '../musd/musd-token-response.ts';

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
      urlEndpoint: musdTokenByAddressRegex,
      responseCode: 200,
      response: MUSD_TOKEN_API_RESPONSE,
    },
  ],
};
