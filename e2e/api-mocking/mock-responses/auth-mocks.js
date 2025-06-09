import { AuthenticationController } from '@metamask/profile-sync-controller';

const AuthMocks = AuthenticationController.Mocks;

/**
 * @typedef {Object} MockResponse
 * @property {string} urlEndpoint - The URL endpoint for the mock response
 * @property {Object} response - The mock response data
 * @property {number} responseCode - The HTTP response code
 */

/**
 * @typedef {Object} AuthMocksByMethod
 * @property {MockResponse[]} GET - Array of GET method mock responses
 * @property {MockResponse[]} POST - Array of POST method mock responses
 */

/**
 * Get authentication related mocks with optional custom responses
 * @param {Object} options - Configuration options
 * @param {ReturnType<AuthMocks.getMockAuthNonceResponse>} [options.nonceResponse] - Custom nonce response
 * @param {ReturnType<AuthMocks.getMockAuthLoginResponse>} [options.loginResponse] - Custom login response
 * @param {ReturnType<AuthMocks.getMockAuthAccessTokenResponse>} [options.accessTokenResponse] - Custom access token response
 * @returns {AuthMocksByMethod} Authentication mocks organized by HTTP method
 */
export const getAuthMocks = ({
  nonceResponse,
  loginResponse,
  accessTokenResponse
} = {}) => {
  const authNonceResponse = nonceResponse || AuthMocks.getMockAuthNonceResponse();
  const authLoginResponse = loginResponse || AuthMocks.getMockAuthLoginResponse();
  const authAccessTokenResponse = accessTokenResponse || AuthMocks.getMockAuthAccessTokenResponse();

  return {
    GET: [
      {
        urlEndpoint: authNonceResponse.url,
        response: authNonceResponse.response,
        responseCode: 200
      }
    ],
    POST: [
      {
        urlEndpoint: authLoginResponse.url,
        response: authLoginResponse.response,
        responseCode: 200
      },
      {
        urlEndpoint: authAccessTokenResponse.url,
        response: authAccessTokenResponse.response,
        responseCode: 200
      }
    ]
  };
};
