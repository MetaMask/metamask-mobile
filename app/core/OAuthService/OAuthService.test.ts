import {
  AuthConnection,
  AuthResponse,
  LoginHandlerResult,
} from './OAuthInterface';
import OAuthLoginService from './OAuthService';
import ReduxService, { ReduxStore } from '../redux';
import Engine from '../Engine';
import { OAuthError, OAuthErrorType } from './error';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

const OAUTH_AUD = 'metamask';
const MOCK_USER_ID = 'user-id';
const MOCK_JWT_TOKEN =
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN3bmFtOTA5QGdtYWlsLmNvbSIsInN1YiI6InN3bmFtOTA5QGdtYWlsLmNvbSIsImlzcyI6Im1ldGFtYXNrIiwiYXVkIjoibWV0YW1hc2siLCJpYXQiOjE3NDUyMDc1NjYsImVhdCI6MTc0NTIwNzg2NiwiZXhwIjoxNzQ1MjA3ODY2fQ.nXRRLB7fglRll7tMzFFCU0u7Pu6EddqEYf_DMyRgOENQ6tJ8OLtVknNf83_5a67kl_YKHFO-0PEjvJviPID6xg';

let mockLoginHandlerResponse: () => LoginHandlerResult | undefined = jest
  .fn()
  .mockImplementation(() => ({
    idToken: MOCK_JWT_TOKEN,
    authConnection: AuthConnection.Google,
    clientId: 'clientId',
    web3AuthNetwork: Web3AuthNetwork.Mainnet,
  }));

let mockGetAuthTokens: () => Promise<AuthResponse> = jest
  .fn()
  .mockImplementation(() => ({
    verifier_id: MOCK_USER_ID,
    jwt_tokens: {
      [OAUTH_AUD]: MOCK_JWT_TOKEN,
    },
  }));

jest.mock('./OAuthLoginHandlers', () => ({
  createLoginHandler: () => ({
    login: () => mockLoginHandlerResponse(),
    getAuthTokens: mockGetAuthTokens,
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

let mockAuthenticate = jest.fn().mockImplementation(() => ({
  nodeAuthTokens: [],
  isNewUser: true,
}));
jest
  .spyOn(Engine.context.SeedlessOnboardingController, 'authenticate')
  .mockImplementation(mockAuthenticate);

const expectOAuthError = async (
  promiseFunc: Promise<unknown>,
  errorType: OAuthErrorType,
) => {
  await expect(promiseFunc).rejects.toThrow(OAuthError);
  try {
    await promiseFunc;
  } catch (error) {
    if (error instanceof OAuthError) {
      expect(error.code).toBe(errorType);
    } else {
      fail('Expected OAuthError');
    }
  }
};

describe('OAuth login service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      dispatch: jest.fn(),
    } as unknown as ReduxStore);
  });

  it('should return a type success', async () => {
    const result = (await OAuthLoginService.handleOAuthLogin(
      AuthConnection.Google,
    )) as { type: string; existingUser: boolean };
    expect(result).toBeDefined();
    expect(result.type).toBe('success');
    expect(result.existingUser).toBe(false);

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('should return a type success, existing user', async () => {
    mockAuthenticate = jest.fn().mockImplementation(() => ({
      nodeAuthTokens: [],
      isNewUser: false,
    }));
    jest
      .spyOn(Engine.context.SeedlessOnboardingController, 'authenticate')
      .mockImplementation(mockAuthenticate);

    const result = await OAuthLoginService.handleOAuthLogin(
      AuthConnection.Google,
    );
    expect(result).toBeDefined();

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('should throw on SeedlessOnboardingController error', async () => {
    mockAuthenticate = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    jest
      .spyOn(Engine.context.SeedlessOnboardingController, 'authenticate')
      .mockImplementation(mockAuthenticate);

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(AuthConnection.Google),
      OAuthErrorType.LoginError,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('should throw on AuthServerError', async () => {
    mockGetAuthTokens = jest.fn().mockImplementation(() => {
      throw new OAuthError('Auth server error', OAuthErrorType.AuthServerError);
    });

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(AuthConnection.Google),
      OAuthErrorType.AuthServerError,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(0);
  });

  it('should throw on dismiss', async () => {
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      dispatch: jest.fn(),
    } as unknown as ReduxStore);

    mockLoginHandlerResponse = jest.fn().mockImplementation(() => {
      throw new OAuthError('Login dismissed', OAuthErrorType.UserDismissed);
    });

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(AuthConnection.Google),
      OAuthErrorType.UserDismissed,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(0);
    expect(mockAuthenticate).toHaveBeenCalledTimes(0);
  });

  it('should throw on login error', async () => {
    mockLoginHandlerResponse = jest.fn().mockImplementation(() => {
      throw new OAuthError('Login error', OAuthErrorType.LoginError);
    });

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(AuthConnection.Google),
      OAuthErrorType.LoginError,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(0);
    expect(mockAuthenticate).toHaveBeenCalledTimes(0);
  });
});
