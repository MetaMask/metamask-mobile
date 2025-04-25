import { AuthConnection, LoginHandlerResult } from './Oauth2loginInterface';
import Oauth2LoginService from './Oauth2loginService';
import ReduxService, { ReduxStore } from '../redux';
import { Oauth2LoginError, Oauth2LoginErrors } from './error';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
  getState: () => ({ security: { allowLoginWithRememberMe: true } }),
  dispatch: jest.fn(),
} as unknown as ReduxStore);
// const actualSeedlessOnboardingController = jest.requireActual('./Oauth2LoginHandler');

const OAUTH_AUD = 'metamask';
const MOCK_USER_ID = 'user-id';
const MOCK_JWT_TOKEN =
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN3bmFtOTA5QGdtYWlsLmNvbSIsInN1YiI6InN3bmFtOTA5QGdtYWlsLmNvbSIsImlzcyI6Im1ldGFtYXNrIiwiYXVkIjoibWV0YW1hc2siLCJpYXQiOjE3NDUyMDc1NjYsImVhdCI6MTc0NTIwNzg2NiwiZXhwIjoxNzQ1MjA3ODY2fQ.nXRRLB7fglRll7tMzFFCU0u7Pu6EddqEYf_DMyRgOENQ6tJ8OLtVknNf83_5a67kl_YKHFO-0PEjvJviPID6xg';

let mockLoginHandlerResponse: () => LoginHandlerResult | undefined = () =>
  undefined;
jest.mock('./Oauth2LoginHandler', () => {
  const actualOauth2LoginHandler = jest.requireActual('./Oauth2LoginHandler');
  return {
    ...actualOauth2LoginHandler,
    createLoginHandler: () => ({
      login: () => mockLoginHandlerResponse(),
      getAuthTokens: () => ({}),
    }),
  };
});

describe('Oauth2 login service', () => {
  it('should return a type dismiss', async () => {
    const result = Oauth2LoginService.handleOauth2Login(AuthConnection.Google);

    try {
      await result;
    } catch (error) {
      expect(error).toBeInstanceOf(Oauth2LoginError);
      expect((error as Oauth2LoginError).code).toBe(
        Oauth2LoginErrors.UserDismissed,
      );
    }

    mockLoginHandlerResponse = () => {
      throw new Oauth2LoginError('Login error', Oauth2LoginErrors.LoginError);
    };

    const result2 = Oauth2LoginService.handleOauth2Login(AuthConnection.Google);
    try {
      await result2;
    } catch (error) {
      expect(error).toBeInstanceOf(Oauth2LoginError);
      expect((error as Oauth2LoginError).code).toBe(
        Oauth2LoginErrors.LoginError,
      );
    }

    mockLoginHandlerResponse = () => ({
      idToken: 'empty token',
      authConnection: AuthConnection.Google,
      clientId: 'clientId',
      web3AuthNetwork: Web3AuthNetwork.Mainnet,
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({
        verifier_id: MOCK_USER_ID,
        jwt_tokens: {
          [OAUTH_AUD]: MOCK_JWT_TOKEN,
        },
      }),
    } as unknown as Response);


    try {
      const result3 = Oauth2LoginService.handleOauth2Login(
        AuthConnection.Google,
      );
      await result3;
    } catch (error) {
      expect(error).toBeInstanceOf(Oauth2LoginError);
      expect((error as Oauth2LoginError).code).toBe(
        Oauth2LoginErrors.LoginError,
      );
    }
  });
});
