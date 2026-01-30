import { AuthenticationController } from '@metamask/profile-sync-controller';
import { MockEventsObject } from '../../framework';

const AuthMocks = AuthenticationController.Mocks;
/**
 * Get authentication related mocks with optional custom responses
 */
export const getAuthMocks = (
  options: {
    nonceResponse?: ReturnType<typeof AuthMocks.getMockAuthNonceResponse>;
    loginResponse?: ReturnType<typeof AuthMocks.getMockAuthLoginResponse>;
    accessTokenResponse?: ReturnType<
      typeof AuthMocks.getMockAuthAccessTokenResponse
    >;
  } = {},
): Partial<MockEventsObject> => {
  const authNonceResponse =
    options.nonceResponse ?? AuthMocks.getMockAuthNonceResponse();
  const authLoginResponse =
    options.loginResponse ?? AuthMocks.getMockAuthLoginResponse();
  const authAccessTokenResponse =
    options.accessTokenResponse ?? AuthMocks.getMockAuthAccessTokenResponse();

  return {
    GET: [
      {
        urlEndpoint: authNonceResponse.url,
        response: authNonceResponse.response,
        responseCode: 200,
      },
    ],
    POST: [
      {
        urlEndpoint: authLoginResponse.url,
        response: authLoginResponse.response,
        responseCode: 200,
      },
      {
        urlEndpoint: authAccessTokenResponse.url,
        response: authAccessTokenResponse.response,
        responseCode: 200,
      },
    ],
  };
};
