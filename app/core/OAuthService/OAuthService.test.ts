import { Platform } from 'react-native';
import { AuthConnection } from './OAuthInterface';
import ReduxService, { ReduxStore } from '../redux';
import Engine from '../Engine';
import { OAuthError, OAuthErrorType } from './error';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { TraceName, TraceOperation } from '../../util/trace';
import { signOut as acmSignOut } from '@metamask/react-native-acm';
import { SET_SEEDLESS_ONBOARDING } from '../../actions/onboarding';

const MOCK_JWT_TOKEN =
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN3bmFtOTA5QGdtYWlsLmNvbSIsInN1YiI6InN3bmFtOTA5QGdtYWlsLmNvbSIsImlzcyI6Im1ldGFtYXNrIiwiYXVkIjoibWV0YW1hc2siLCJpYXQiOjE3NDUyMDc1NjYsImVhdCI6MTc0NTIwNzg2NiwiZXhwIjoxNzQ1MjA3ODY2fQ.nXRRLB7fglRll7tMzFFCU0u7Pu6EddqEYf_DMyRgOENQ6tJ8OLtVknNf83_5a67kl_YKHFO-0PEjvJviPID6xg';

const mockDeviceIsAndroid = jest.fn();

jest.mock('./OAuthLoginHandlers/constants', () => ({
  web3AuthNetwork: 'sapphire_mainnet',
  AuthServerUrl: 'https://auth.example.com',
  E2E_QA_MOCK_OAUTH_TOKEN_URL:
    'https://auth-service.uat-api.cx.metamask.io/api/v1/qa/mock/oauth/token',
  AUTH_SERVER_MARKETING_OPT_IN_PATH: '/api/v1/oauth/marketing_opt_in_status',
  SupportedPlatforms: {
    Android: 'android',
    IOS: 'ios',
  },
  IosGID: 'mock-ios-google-client-id',
  IosGoogleRedirectUri: 'mock-ios-google-redirect-uri',
  GoogleWebGID: 'mock-android-google-client-id',
  AppleWebClientId: 'mock-android-apple-client-id',
  AuthConnectionConfig: {
    android: {
      google: {
        authConnectionId: 'mock-android-auth-connection-id',
        groupedAuthConnectionId: 'mock-android-grouped-auth-connection-id',
      },
      apple: {
        authConnectionId: 'mock-android-apple-auth-connection-id',
        groupedAuthConnectionId:
          'mock-android-apple-grouped-auth-connection-id',
      },
    },
    ios: {
      google: {
        authConnectionId: 'mock-ios-auth-connection-id',
        groupedAuthConnectionId: 'mock-ios-grouped-auth-connection-id',
      },
      apple: {
        authConnectionId: 'mock-ios-apple-auth-connection-id',
        groupedAuthConnectionId: 'mock-ios-apple-grouped-auth-connection-id',
      },
    },
  },
  AppleServerRedirectUri: 'https://auth.example.com/api/v1/oauth/callback',
}));

jest.mock('@metamask/react-native-acm', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
  signInWithGoogle: jest.fn(),
}));

jest.mock('../../util/analytics/whenEngineReady', () => ({
  whenEngineReady: jest.fn().mockResolvedValue(undefined),
}));

const mockTrace = jest.fn();
const mockEndTrace = jest.fn();

jest.mock('../../util/trace', () => ({
  ...jest.requireActual('../../util/trace'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trace: (...args: any[]) => mockTrace(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  endTrace: (...args: any[]) => mockEndTrace(...args),
}));

jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

jest.mock('../../util/device', () => ({
  __esModule: true,
  default: {
    isAndroid: (...args: unknown[]) => mockDeviceIsAndroid(...args),
  },
}));

const mockIsE2EMockOAuth = jest.fn().mockReturnValue(false);
const mockGetE2EByoaAuthSecret = jest.fn<string | undefined, []>(
  () => undefined,
);

jest.mock('../../util/environment', () => ({
  ...jest.requireActual('../../util/environment'),
  isE2EMockOAuth: () => mockIsE2EMockOAuth(),
  getE2EByoaAuthSecret: () => mockGetE2EByoaAuthSecret(),
}));

import { analytics } from '../../util/analytics/analytics';
import { AccountType } from '../../constants/onboarding';
import OAuthLoginService from './OAuthService';
const defaultLoginHandlerResponse = () => ({
  idToken: MOCK_JWT_TOKEN,
  authConnection: AuthConnection.Google,
  clientId: 'clientId',
  web3AuthNetwork: Web3AuthNetwork.Mainnet,
});

const mockLoginHandlerResponse = jest
  .fn()
  .mockImplementation(defaultLoginHandlerResponse);

const mockGetAuthTokens = jest.fn().mockImplementation(() => ({
  id_token: MOCK_JWT_TOKEN,
  access_token: 'mock-access-token',
  indexes: [1, 2, 3],
  endpoints: { endpoint1: 'value1' },
  refresh_token: 'mock-refresh-token',
  revoke_token: 'mock-revoke-token',
}));

const mockCreateLoginHandler = jest.fn().mockImplementation(() => ({
  authConnection: AuthConnection.Google,
  options: {
    clientId: 'e2e-mock-google-client-id',
    authServerUrl: 'https://auth.example.com',
    web3AuthNetwork: 'sapphire_mainnet',
  },
  login: () => mockLoginHandlerResponse(),
  getAuthTokens: () => mockGetAuthTokens(),
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

jest.mock('../Engine', () => ({
  context: {
    SeedlessOnboardingController: {
      authenticate: jest.fn().mockImplementation(() => ({
        nodeAuthTokens: [],
        isNewUser: false,
      })),
      state: {
        accessToken: undefined,
        socialBackupsMetadata: [],
        isSeedlessOnboardingUserAuthenticated: false,
      },
    },
  },
}));

const mockAuthenticate = jest.fn().mockImplementation(() => ({
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
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoginHandlerResponse.mockImplementation(defaultLoginHandlerResponse);
    mockDispatch = jest.fn();
    mockDeviceIsAndroid.mockReturnValue(false);
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        security: { allowLoginWithRememberMe: true },
        onboarding: {},
      }),
      dispatch: mockDispatch,
    } as unknown as ReduxStore);
  });

  it('return a type success', async () => {
    const loginHandler = mockCreateLoginHandler();
    const result = (await OAuthLoginService.handleOAuthLogin(
      loginHandler,
      false,
    )) as {
      type: string;
      existingUser: boolean;
    };
    expect(result).toBeDefined();
    expect(result.type).toBe('success');
    expect(result.existingUser).toBe(false);

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledWith(
      expect.objectContaining({
        authConnectionId: 'mock-ios-auth-connection-id',
        groupedAuthConnectionId: 'mock-ios-grouped-auth-connection-id',
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SET_SEEDLESS_ONBOARDING,
      clientId: 'clientId',
      authConnection: AuthConnection.Google,
    });
  });

  it('return a type success, existing user', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockAuthenticate.mockImplementation(() => ({
      nodeAuthTokens: [],
      isNewUser: false,
    }));
    jest
      .spyOn(Engine.context.SeedlessOnboardingController, 'authenticate')
      .mockImplementation(mockAuthenticate);

    const result = await OAuthLoginService.handleOAuthLogin(
      loginHandler,
      false,
    );
    expect(result).toBeDefined();

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('uses Android auth connection config when the device is Android', async () => {
    mockDeviceIsAndroid.mockReturnValue(true);
    const loginHandler = mockCreateLoginHandler();

    await OAuthLoginService.handleOAuthLogin(loginHandler, false);

    expect(mockAuthenticate).toHaveBeenCalledWith(
      expect.objectContaining({
        authConnectionId: 'mock-android-auth-connection-id',
        groupedAuthConnectionId: 'mock-android-grouped-auth-connection-id',
      }),
    );
  });

  it('uses Android auth connection config for iOS Google web credential login before onboarding state is persisted', async () => {
    mockLoginHandlerResponse.mockImplementation(() => ({
      idToken: MOCK_JWT_TOKEN,
      authConnection: AuthConnection.Google,
      clientId: 'mock-android-google-client-id',
      web3AuthNetwork: Web3AuthNetwork.Mainnet,
    }));
    const loginHandler = mockCreateLoginHandler();

    await OAuthLoginService.handleOAuthLogin(loginHandler, false);

    expect(mockAuthenticate).toHaveBeenCalledWith(
      expect.objectContaining({
        authConnectionId: 'mock-android-auth-connection-id',
        groupedAuthConnectionId: 'mock-android-grouped-auth-connection-id',
      }),
    );
  });

  it('uses Android auth connection config when persisted onboarding clientId matches the web Google client', async () => {
    mockLoginHandlerResponse.mockImplementation(() => ({
      idToken: MOCK_JWT_TOKEN,
      authConnection: AuthConnection.Google,
      clientId: 'mock-android-google-client-id',
      web3AuthNetwork: Web3AuthNetwork.Mainnet,
    }));
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        security: { allowLoginWithRememberMe: true },
        onboarding: {
          seedlessOnboarding: {
            clientId: 'mock-android-google-client-id',
          },
        },
      }),
      dispatch: mockDispatch,
    } as unknown as ReduxStore);
    const loginHandler = mockCreateLoginHandler();

    await OAuthLoginService.handleOAuthLogin(loginHandler, false);

    expect(mockAuthenticate).toHaveBeenCalledWith(
      expect.objectContaining({
        authConnectionId: 'mock-android-auth-connection-id',
        groupedAuthConnectionId: 'mock-android-grouped-auth-connection-id',
      }),
    );
  });

  it('throw on SeedlessOnboardingController error', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockAuthenticate.mockImplementation(() => {
      throw new Error('Test error');
    });
    jest
      .spyOn(Engine.context.SeedlessOnboardingController, 'authenticate')
      .mockImplementation(mockAuthenticate);

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
      OAuthErrorType.LoginError,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('throw on AuthServerError', async () => {
    mockGetAuthTokens.mockImplementation(() => {
      throw new OAuthError('Auth server error', OAuthErrorType.AuthServerError);
    });
    const loginHandler = mockCreateLoginHandler();

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
      OAuthErrorType.AuthServerError,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).toHaveBeenCalledTimes(0);
  });

  it('throw on dismiss', async () => {
    const loginHandler = mockCreateLoginHandler();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        security: { allowLoginWithRememberMe: true },
        onboarding: {},
      }),
      dispatch: jest.fn(),
    } as unknown as ReduxStore);

    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError('Login dismissed', OAuthErrorType.UserDismissed);
    });

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
      OAuthErrorType.UserDismissed,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(0);
    expect(mockAuthenticate).toHaveBeenCalledTimes(0);
  });

  it('throw on login error', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError('Login error', OAuthErrorType.LoginError);
    });

    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
      OAuthErrorType.LoginError,
    );

    expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(0);
    expect(mockAuthenticate).toHaveBeenCalledTimes(0);
  });

  it('SOCIAL_LOGIN_FAILED uses new-user account_type when not rehydrating', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError('Login error', OAuthErrorType.LoginError);
    });

    await expect(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
    ).rejects.toMatchObject({ code: OAuthErrorType.LoginError });

    expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Failed',
        properties: expect.objectContaining({
          account_type: AccountType.MetamaskGoogle,
          is_rehydration: 'false',
        }),
      }),
    );
  });

  it('SOCIAL_LOGIN_FAILED uses existing-user account_type when rehydrating', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError('Login error', OAuthErrorType.LoginError);
    });

    await expect(
      OAuthLoginService.handleOAuthLogin(loginHandler, true),
    ).rejects.toMatchObject({ code: OAuthErrorType.LoginError });

    expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Failed',
        properties: expect.objectContaining({
          account_type: AccountType.ImportedGoogle,
          is_rehydration: 'true',
        }),
      }),
    );
  });

  // use for loop to test undefine and null cases
  for (const value of [undefined, null]) {
    it(`throws error when login handler returns ${value}`, async () => {
      mockLoginHandlerResponse.mockClear();
      mockLoginHandlerResponse.mockImplementation(() => value);
      const loginHandler = mockCreateLoginHandler();

      await expectOAuthError(
        OAuthLoginService.handleOAuthLogin(loginHandler, false),
        OAuthErrorType.LoginError,
      );

      expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
      expect(mockGetAuthTokens).toHaveBeenCalledTimes(0);
      expect(mockAuthenticate).toHaveBeenCalledTimes(0);
    });
  }

  it('does not trace OnboardingOAuthProviderLoginError when login throws UserCancelled', async () => {
    // Arrange
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError(
        'User cancelled the login process',
        OAuthErrorType.UserCancelled,
      );
    });

    // Act
    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
      OAuthErrorType.UserCancelled,
    );

    // Assert
    expect(mockTrace).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingOAuthProviderLoginError,
      }),
    );
    expect(mockEndTrace).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingOAuthProviderLoginError,
      }),
    );
  });

  it('does not trace OnboardingOAuthProviderLoginError when login throws UserDismissed', async () => {
    // Arrange
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError(
        'User dismissed the login process',
        OAuthErrorType.UserDismissed,
      );
    });

    // Act
    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
      OAuthErrorType.UserDismissed,
    );

    // Assert
    expect(mockTrace).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingOAuthProviderLoginError,
      }),
    );
    expect(mockEndTrace).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingOAuthProviderLoginError,
      }),
    );
  });

  it('traces OnboardingOAuthProviderLoginError when login throws a non-user-action error', async () => {
    // Arrange
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError('Login error', OAuthErrorType.LoginError);
    });

    // Act
    await expectOAuthError(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
      OAuthErrorType.LoginError,
    );

    // Assert
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingOAuthProviderLoginError,
        op: TraceOperation.OnboardingError,
        tags: { errorMessage: 'Login error - Login error' },
      }),
    );
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingOAuthProviderLoginError,
      }),
    );
  });

  describe('acmSignOut on Android Google login', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
      mockLoginHandlerResponse.mockImplementation(() => ({
        idToken: MOCK_JWT_TOKEN,
        authConnection: AuthConnection.Google,
        clientId: 'clientId',
        web3AuthNetwork: Web3AuthNetwork.Mainnet,
      }));
      mockGetAuthTokens.mockImplementation(() => ({
        id_token: MOCK_JWT_TOKEN,
        access_token: 'mock-access-token',
        indexes: [1, 2, 3],
        endpoints: { endpoint1: 'value1' },
        refresh_token: 'mock-refresh-token',
        revoke_token: 'mock-revoke-token',
      }));
      mockAuthenticate.mockImplementation(() => ({
        nodeAuthTokens: [],
        isNewUser: true,
      }));
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
      (acmSignOut as jest.Mock).mockClear();
    });

    it('calls acmSignOut after successful Google login on Android', async () => {
      Platform.OS = 'android';
      const loginHandler = mockCreateLoginHandler();

      await OAuthLoginService.handleOAuthLogin(loginHandler, false);

      expect(acmSignOut).toHaveBeenCalledTimes(1);
    });

    it('does not call acmSignOut on iOS Google login', async () => {
      Platform.OS = 'ios';
      const loginHandler = mockCreateLoginHandler();

      await OAuthLoginService.handleOAuthLogin(loginHandler, false);

      expect(acmSignOut).not.toHaveBeenCalled();
    });

    it('does not call acmSignOut for Apple login on Android', async () => {
      Platform.OS = 'android';
      const loginHandler = {
        ...mockCreateLoginHandler(),
        authConnection: AuthConnection.Apple,
      };

      await OAuthLoginService.handleOAuthLogin(loginHandler, false);

      expect(acmSignOut).not.toHaveBeenCalled();
    });

    it('calls acmSignOut even when provider login fails on Android', async () => {
      Platform.OS = 'android';
      mockLoginHandlerResponse.mockImplementation(() => {
        throw new OAuthError('User cancelled', OAuthErrorType.UserCancelled);
      });
      const loginHandler = mockCreateLoginHandler();

      await expect(
        OAuthLoginService.handleOAuthLogin(loginHandler, false),
      ).rejects.toThrow();

      expect(acmSignOut).toHaveBeenCalledTimes(1);
    });

    it('handles acmSignOut failure gracefully', async () => {
      Platform.OS = 'android';
      (acmSignOut as jest.Mock).mockRejectedValueOnce(
        new Error('signOut failed'),
      );
      const loginHandler = mockCreateLoginHandler();

      const result = await OAuthLoginService.handleOAuthLogin(
        loginHandler,
        false,
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('success');
      expect(acmSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('resets local OAuth state when OAuth state is reset', () => {
    OAuthLoginService.localState = {
      ...OAuthLoginService.localState,
      loginInProgress: true,
      oauthLoginSuccess: true,
      oauthLoginError: 'previous error',
    };

    OAuthLoginService.resetOauthState();

    expect(OAuthLoginService.localState.loginInProgress).toBe(false);
    expect(OAuthLoginService.localState.oauthLoginSuccess).toBe(false);
    expect(OAuthLoginService.localState.oauthLoginError).toBeNull();
  });

  describe('E2E_MOCK_OAUTH mode', () => {
    let fetchSpy: jest.SpiedFunction<typeof fetch>;

    const qaMockTokenEnvelope = () => ({
      success: true,
      data: {
        tokens: {
          jwt_token: MOCK_JWT_TOKEN,
          access_token: 'mock-access-token',
          metadata_access_token: 'mock-metadata-access-token',
          refresh_token: 'mock-refresh-token',
          revoke_token: 'mock-revoke-token',
          indexes: [1, 2, 3],
          endpoints: { endpoint1: 'value1' },
        },
      },
    });

    beforeEach(() => {
      mockIsE2EMockOAuth.mockReturnValue(true);
      mockGetE2EByoaAuthSecret.mockReturnValue('test-byoa-secret');
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(qaMockTokenEnvelope()),
      } as Response);
    });

    afterEach(() => {
      fetchSpy.mockRestore();
      mockIsE2EMockOAuth.mockReturnValue(false);
      mockGetE2EByoaAuthSecret.mockReturnValue(undefined);
      delete process.env.E2E_MOCK_OAUTH_EMAIL;
    });

    it('exchanges QA mock tokens and returns mock success without seedless authenticate', async () => {
      const loginHandler = mockCreateLoginHandler();

      const result = await OAuthLoginService.handleOAuthLogin(
        loginHandler,
        false,
      );

      expect(result.type).toBe('success');
      expect(result.existingUser).toBe(false);
      expect(result.accountName).toBe('swnam909@gmail.com');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://auth-service.uat-api.cx.metamask.io/api/v1/qa/mock/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'byoa-auth-secret': 'test-byoa-secret',
          },
        }),
      );
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body).toMatchObject({
        email_id: 'newuser+e2e@web3auth.io',
        client_id: 'e2e-mock-google-client-id',
        login_provider: AuthConnection.Google,
        access_type: 'offline',
      });
      expect(mockAuthenticate).not.toHaveBeenCalled();
      expect(mockLoginHandlerResponse).not.toHaveBeenCalled();
      expect(mockGetAuthTokens).not.toHaveBeenCalled();
    });

    it('uses E2E_MOCK_OAUTH_EMAIL for email_id when set', async () => {
      process.env.E2E_MOCK_OAUTH_EMAIL = 'custom+e2e@web3auth.io';
      const loginHandler = mockCreateLoginHandler();

      await OAuthLoginService.handleOAuthLogin(loginHandler, false);

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.email_id).toBe('custom+e2e@web3auth.io');
    });

    it('rejects when QA mock token response is non-OK', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      } as Response);
      const loginHandler = mockCreateLoginHandler();

      await expectOAuthError(
        OAuthLoginService.handleOAuthLogin(loginHandler, false),
        OAuthErrorType.LoginError,
      );

      expect(mockAuthenticate).not.toHaveBeenCalled();
    });

    it('succeeds when QA mock response omits refresh_token', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              tokens: {
                jwt_token: MOCK_JWT_TOKEN,
                access_token: 'mock-access-token',
                metadata_access_token: 'mock-metadata-access-token',
              },
            },
          }),
      } as Response);
      const loginHandler = mockCreateLoginHandler();

      const result = await OAuthLoginService.handleOAuthLogin(
        loginHandler,
        false,
      );

      expect(result.type).toBe('success');
      expect(mockAuthenticate).not.toHaveBeenCalled();
    });

    it('does not call provider login, getAuthTokens, or seedless authenticate', async () => {
      const loginHandler = mockCreateLoginHandler();

      await OAuthLoginService.handleOAuthLogin(loginHandler, false);

      expect(mockLoginHandlerResponse).not.toHaveBeenCalled();
      expect(mockGetAuthTokens).not.toHaveBeenCalled();
      expect(mockAuthenticate).not.toHaveBeenCalled();
    });
  });
});

describe('updateMarketingOptInStatus', () => {
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
    // Reset the Engine state to default
    Engine.context.SeedlessOnboardingController.state = {
      accessToken: undefined,
      socialBackupsMetadata: [],
      isSeedlessOnboardingUserAuthenticated: false,
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should successfully update marketing opt-in status to true', async () => {
    // Arrange
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    // Act
    await OAuthLoginService.updateMarketingOptInStatus(true);

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      'https://auth.example.com/api/v1/oauth/marketing_opt_in_status',
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
    // Arrange
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    // Act
    await OAuthLoginService.updateMarketingOptInStatus(false);

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      'https://auth.example.com/api/v1/oauth/marketing_opt_in_status',
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
    // Arrange
    Engine.context.SeedlessOnboardingController.state.accessToken = undefined;

    // Act & Assert
    await expect(
      OAuthLoginService.updateMarketingOptInStatus(true),
    ).rejects.toThrow('No access token found. User must be authenticated.');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw error when access token is null', async () => {
    // Arrange
    Engine.context.SeedlessOnboardingController.state.accessToken = undefined;

    // Act & Assert
    await expect(
      OAuthLoginService.updateMarketingOptInStatus(true),
    ).rejects.toThrow('No access token found. User must be authenticated.');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw error when API request fails with 400 status', async () => {
    // Arrange
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: jest.fn().mockResolvedValue({ message: 'Invalid request' }),
    });

    // Act & Assert
    await expect(
      OAuthLoginService.updateMarketingOptInStatus(true),
    ).rejects.toThrow(
      'Failed to update marketing opt-in status: 400 - Invalid request',
    );
  });

  it('should throw error when API request fails with 401 status', async () => {
    // Arrange
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: jest.fn().mockResolvedValue({ message: 'Token expired' }),
    });

    // Act & Assert
    await expect(
      OAuthLoginService.updateMarketingOptInStatus(false),
    ).rejects.toThrow(
      'Failed to update marketing opt-in status: 401 - Token expired',
    );
  });

  it('should throw error when API request fails with 500 status', async () => {
    // Arrange
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: jest.fn().mockResolvedValue({ message: 'Server error' }),
    });

    // Act & Assert
    await expect(
      OAuthLoginService.updateMarketingOptInStatus(true),
    ).rejects.toThrow(
      'Failed to update marketing opt-in status: 500 - Server error',
    );
  });

  it('should handle API error without JSON response', async () => {
    // Arrange
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    });

    // Act & Assert
    await expect(
      OAuthLoginService.updateMarketingOptInStatus(true),
    ).rejects.toThrow(
      'Failed to update marketing opt-in status: 500 - Internal Server Error',
    );
  });

  it('should handle API error with empty JSON response', async () => {
    // Arrange
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: jest.fn().mockResolvedValue({}),
    });

    // Act & Assert
    await expect(
      OAuthLoginService.updateMarketingOptInStatus(false),
    ).rejects.toThrow(
      'Failed to update marketing opt-in status: 422 - Unprocessable Entity',
    );
  });

  it('should handle network error during fetch', async () => {
    // Arrange
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Act & Assert
    await expect(
      OAuthLoginService.updateMarketingOptInStatus(true),
    ).rejects.toThrow('Network error');
  });

  it('should use correct URL and headers for the API request', async () => {
    // Arrange
    const mockAccessToken = 'test-token-123';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    // Act
    await OAuthLoginService.updateMarketingOptInStatus(true);

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    expect(url).toBe(
      'https://auth.example.com/api/v1/oauth/marketing_opt_in_status',
    );
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token-123',
    });
    expect(options.body).toBe(JSON.stringify({ opt_in_status: true }));
  });

  it('should handle multiple consecutive calls correctly', async () => {
    // Arrange
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    // Act
    await OAuthLoginService.updateMarketingOptInStatus(true);
    await OAuthLoginService.updateMarketingOptInStatus(false);
    await OAuthLoginService.updateMarketingOptInStatus(true);

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ opt_in_status: true }),
      }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ opt_in_status: false }),
      }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ opt_in_status: true }),
      }),
    );
  });
});

describe('getMarketingOptInStatus', () => {
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
    Engine.context.SeedlessOnboardingController.state = {
      accessToken: undefined,
      socialBackupsMetadata: [],
      isSeedlessOnboardingUserAuthenticated: false,
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should successfully get marketing opt-in status when user is opted in', async () => {
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    const mockResponse = {
      is_opt_in: true,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await OAuthLoginService.getMarketingOptInStatus();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://auth.example.com/api/v1/oauth/marketing_opt_in_status',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
      },
    );
    expect(result).toEqual(mockResponse);
  });

  it('should successfully get marketing opt-in status when user is not opted in', async () => {
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    const mockResponse = {
      is_opt_in: false,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await OAuthLoginService.getMarketingOptInStatus();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://auth.example.com/api/v1/oauth/marketing_opt_in_status',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
      },
    );
    expect(result).toEqual(mockResponse);
  });

  it('should throw error when no access token is available', async () => {
    Engine.context.SeedlessOnboardingController.state.accessToken = undefined;

    await expect(OAuthLoginService.getMarketingOptInStatus()).rejects.toThrow(
      'No access token found. User must be authenticated.',
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw error when access token is null', async () => {
    Engine.context.SeedlessOnboardingController.state.accessToken = undefined;

    await expect(OAuthLoginService.getMarketingOptInStatus()).rejects.toThrow(
      'No access token found. User must be authenticated.',
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should use correct URL and headers for the API request', async () => {
    const mockAccessToken = 'test-token-123';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    const mockResponse = {
      is_opt_in: true,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await OAuthLoginService.getMarketingOptInStatus();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    expect(url).toBe(
      'https://auth.example.com/api/v1/oauth/marketing_opt_in_status',
    );
    expect(options.method).toBe('GET');
    expect(options.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token-123',
    });
    expect(result).toEqual(mockResponse);
  });

  it('should handle multiple consecutive calls correctly', async () => {
    const mockAccessToken = 'mock-access-token';
    Engine.context.SeedlessOnboardingController.state.accessToken =
      mockAccessToken;

    const mockResponse1 = { is_opt_in: true };
    const mockResponse2 = { is_opt_in: false };
    const mockResponse3 = { is_opt_in: true };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse1),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse2),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse3),
      });

    const result1 = await OAuthLoginService.getMarketingOptInStatus();
    const result2 = await OAuthLoginService.getMarketingOptInStatus();
    const result3 = await OAuthLoginService.getMarketingOptInStatus();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result1).toEqual(mockResponse1);
    expect(result2).toEqual(mockResponse2);
    expect(result3).toEqual(mockResponse3);
  });
});
