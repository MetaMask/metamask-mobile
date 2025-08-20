import { TestSpecificMock } from '../../../framework';
import { TOKEN_API_TOKENS_RESPONSE } from '../token-api-responses';

/**
 * Mock data for MetaMask token API endpoints used in E2E testing.
 * Covers token metadata and token lists for various networks.
 */

const tokenListRegex =
  /^https:\/\/token\.api\.cx\.metamask\.io\/tokens\/\d+\?.*$/;

export const TOKEN_API_MOCKS: TestSpecificMock = {
  GET: [
    {
      urlEndpoint: tokenListRegex,
      responseCode: 200,
      response: TOKEN_API_TOKENS_RESPONSE,
    },
  ],
};
