import { AuthConnection, LoginHandlerResult } from './OAuthInterface';
import OAuthLoginService from './OAuthService';
import ReduxService, { ReduxStore } from '../redux';
import { OAuthError, OAuthErrorType } from './error';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

const OAUTH_AUD = 'metamask';
const MOCK_USER_ID = 'user-id';
const MOCK_JWT_TOKEN =
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN3bmFtOTA5QGdtYWlsLmNvbSIsInN1YiI6InN3bmFtOTA5QGdtYWlsLmNvbSIsImlzcyI6Im1ldGFtYXNrIiwiYXVkIjoibWV0YW1hc2siLCJpYXQiOjE3NDUyMDc1NjYsImVhdCI6MTc0NTIwNzg2NiwiZXhwIjoxNzQ1MjA3ODY2fQ.nXRRLB7fglRll7tMzFFCU0u7Pu6EddqEYf_DMyRgOENQ6tJ8OLtVknNf83_5a67kl_YKHFO-0PEjvJviPID6xg';

let mockLoginHandlerResponse: () => LoginHandlerResult | undefined = () =>
  undefined;
jest.mock('./OAuthLoginHandlers', () => ({
  createLoginHandler: () => ({
    login: () => mockLoginHandlerResponse(),
    getAuthTokens: () => ({
      verifier_id: MOCK_USER_ID,
      jwt_tokens: {
        [OAUTH_AUD]: MOCK_JWT_TOKEN,
      },
    }),
    decodeIdToken: () =>
      JSON.stringify({
        email: 'swnam909@gmail.com',
        sub: 'swnam909@gmail.com',
        iss: 'metamask',
        aud: 'metamask',
        iat: 1745207566,
        eat: 1745207866,
        exp: 1745207866,
      }),
  }),
}));

jest.mock('../Engine', () => ({
  context: {
    SeedlessOnboardingController: {
      authenticate: jest.fn().mockImplementation(() => ({
        nodeAuthTokens: [],
        isNewUser: false,
      })),
    },
  },
}));

describe('OAuth login service', () => {
  it('should throw on Error or dismiss', async () => {
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      dispatch: jest.fn(),
    } as unknown as ReduxStore);

    mockLoginHandlerResponse = () => {
      throw new OAuthError('Login dismissed', OAuthErrorType.UserDismissed);
    };
    const result = OAuthLoginService.handleOAuth2Login(AuthConnection.Google);

    await expect(result).rejects.toThrow(OAuthError);

    mockLoginHandlerResponse = () => {
      throw new OAuthError('Login error', OAuthErrorType.LoginError);
    };

    await expect(
      OAuthLoginService.handleOAuth2Login(AuthConnection.Google),
    ).rejects.toThrow(OAuthError);
  });

  it('should return a type success', async () => {
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      dispatch: jest.fn(),
    } as unknown as ReduxStore);

    mockLoginHandlerResponse = () => ({
      idToken: MOCK_JWT_TOKEN,
      authConnection: AuthConnection.Google,
      clientId: 'clientId',
      web3AuthNetwork: Web3AuthNetwork.Mainnet,
    });

    const finalResult = await OAuthLoginService.handleOAuth2Login(
      AuthConnection.Google,
    );
    expect(finalResult).toBeDefined();
  });
});
