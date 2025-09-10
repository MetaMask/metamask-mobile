import {
  AuthConnection,
  AuthResponse,
  LoginHandlerResult,
} from './OAuthInterface';
import ReduxService, { ReduxStore } from '../redux';
import Engine from '../Engine';
import { OAuthError, OAuthErrorType } from './error';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

const MOCK_JWT_TOKEN =
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN3bmFtOTA5QGdtYWlsLmNvbSIsInN1YiI6InN3bmFtOTA5QGdtYWlsLmNvbSIsImlzcyI6Im1ldGFtYXNrIiwiYXVkIjoibWV0YW1hc2siLCJpYXQiOjE3NDUyMDc1NjYsImVhdCI6MTc0NTIwNzg2NiwiZXhwIjoxNzQ1MjA3ODY2fQ.nXRRLB7fglRll7tMzFFCU0u7Pu6EddqEYf_DMyRgOENQ6tJ8OLtVknNf83_5a67kl_YKHFO-0PEjvJviPID6xg';

jest.mock('./OAuthLoginHandlers/constants', () => ({
  web3AuthNetwork: 'sapphire_mainnet',
  AuthServerUrl: 'https://auth.example.com',
  IosGID: 'mock-ios-google-client-id',
  IosGoogleRedirectUri: 'mock-ios-google-redirect-uri',
  AndroidGoogleWebGID: 'mock-android-google-client-id',
  AppleWebClientId: 'mock-android-apple-client-id',
  AuthConnectionConfig: {
    android: {
      google: {
        authConnectionId: 'mock-auth-connection-id',
        groupedAuthConnectionId: 'mock-grouped-auth-connection-id',
      },
      apple: {
        authConnectionId: 'mock-auth-connection-id',
        groupedAuthConnectionId: 'mock-grouped-auth-connection-id',
      },
    },
    ios: {
      google: {
        authConnectionId: 'mock-auth-connection-id',
        groupedAuthConnectionId: 'mock-grouped-auth-connection-id',
      },
      apple: {
        authConnectionId: 'mock-auth-connection-id',
        groupedAuthConnectionId: 'mock-grouped-auth-connection-id',
      },
    },
  },
  AppleServerRedirectUri: 'https://auth.example.com/api/v1/oauth/callback',
}));

import OAuthLoginService from './OAuthService';
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
    id_token: MOCK_JWT_TOKEN,
    access_token: 'mock-access-token',
    indexes: [1, 2, 3],
    endpoints: { endpoint1: 'value1' },
    refresh_token: 'mock-refresh-token',
  }));

const mockCreateLoginHandler = jest.fn().mockImplementation(() => ({
  authConnection: AuthConnection.Google,
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
}));

let mockSeedlessOnboardingControllerState: {
  accessToken?: string;
} = {
  accessToken: 'mock-access-token',
};

jest.mock('../Engine', () => ({
  context: {
    SeedlessOnboardingController: {
      authenticate: jest.fn().mockImplementation(() => ({
        nodeAuthTokens: [],
        isNewUser: false,
      })),
      get state() {
        return mockSeedlessOnboardingControllerState;
      },
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

  it('return a type success', async () => {
    const loginHandler = mockCreateLoginHandler();
    const result = (await OAuthLoginService.handleOAuthLogin(loginHandler)) as {
      type: string;
      existingUser: boolean;
    };
    expect(result).toBeDefined();
    expect(result.type).toBe('success');
    expect(result.existingUser).toBe(false);

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('return a type success, existing user', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockAuthenticate = jest.fn().mockImplementation(() => ({
      nodeAuthTokens: [],
      isNewUser: false,
    }));
    jest
      .spyOn(Engine.context.SeedlessOnboardingController, 'authenticate')
      .mockImplementation(mockAuthenticate);

    const result = await OAuthLoginService.handleOAuthLogin(loginHandler);
    expect(result).toBeDefined();

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('throw on SeedlessOnboardingController error', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockAuthenticate = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    jest
      .spyOn(Engine.context.SeedlessOnboardingController, 'authenticate')
      .mockImplementation(mockAuthenticate);

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler),
      OAuthErrorType.LoginError,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('throw on AuthServerError', async () => {
    mockGetAuthTokens = jest.fn().mockImplementation(() => {
      throw new OAuthError('Auth server error', OAuthErrorType.AuthServerError);
    });
    const loginHandler = mockCreateLoginHandler();

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler),
      OAuthErrorType.AuthServerError,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(0);
  });

  it('throw on dismiss', async () => {
    const loginHandler = mockCreateLoginHandler();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      dispatch: jest.fn(),
    } as unknown as ReduxStore);

    mockLoginHandlerResponse = jest.fn().mockImplementation(() => {
      throw new OAuthError('Login dismissed', OAuthErrorType.UserDismissed);
    });

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler),
      OAuthErrorType.UserDismissed,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(0);
    expect(mockAuthenticate).toHaveBeenCalledTimes(0);
  });

  it('throw on login error', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse = jest.fn().mockImplementation(() => {
      throw new OAuthError('Login error', OAuthErrorType.LoginError);
    });

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler),
      OAuthErrorType.LoginError,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(0);
    expect(mockAuthenticate).toHaveBeenCalledTimes(0);
  });
});

describe('updateMarketingOptInStatus', () => {
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    jest.clearAllMocks();

    mockSeedlessOnboardingControllerState = {
      accessToken: mockAccessToken,
    };
  });

  it('should successfully update marketing opt-in status to true', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
    });

    await OAuthLoginService.updateMarketingOptInStatus(true);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://auth-service.dev-api.cx.metamask.io/api/v1/oauth/marketing-opt-in`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
        body: JSON.stringify({ opt_in_status: true }),
      },
    );
  });

  it('should successfully update marketing opt-in status to false', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
    });

    await OAuthLoginService.updateMarketingOptInStatus(false);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://auth-service.dev-api.cx.metamask.io/api/v1/oauth/marketing-opt-in`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
        body: JSON.stringify({ opt_in_status: false }),
      },
    );
  });

  it('should throw error when no access token is available', async () => {
    mockSeedlessOnboardingControllerState = {
      accessToken: undefined,
    };

    await expect(
      OAuthLoginService.updateMarketingOptInStatus(true),
    ).rejects.toThrow('No access token found. User must be authenticated.');
  });

  it('should throw error when API request fails', async () => {
    const mockErrorResponse = {
      message: 'Invalid request',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: jest.fn().mockResolvedValue(mockErrorResponse),
    });

    await expect(
      OAuthLoginService.updateMarketingOptInStatus(true),
    ).rejects.toThrow(
      'Failed to update marketing opt-in status: 400 - Invalid request',
    );
  });

  it('should handle network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(
      OAuthLoginService.updateMarketingOptInStatus(true),
    ).rejects.toThrow('Network error');
  });
});
