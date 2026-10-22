import { Platform } from 'react-native';
import { AuthConnection } from './OAuthInterface';
import ReduxService, { ReduxStore } from '../redux';
import Engine from '../Engine';
import { OAuthError, OAuthErrorType } from './error';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { TraceName, TraceOperation, TraceContext } from '../../util/trace';
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
  getUserInfo: () => ({
    userId: 'swnam909@gmail.com',
    accountName: 'swnam909@gmail.com',
  }),
}));

jest.mock('../Engine', () => ({
  context: {
    SeedlessOnboardingController: {
      preloadToprfNodeDetails: jest.fn().mockResolvedValue(undefined),
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
const mockPreloadToprfNodeDetails = jest.fn().mockResolvedValue(undefined);
jest
  .spyOn(Engine.context.SeedlessOnboardingController, 'preloadToprfNodeDetails')
  .mockImplementation(mockPreloadToprfNodeDetails);
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
    mockPreloadToprfNodeDetails.mockResolvedValue(undefined);
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

  it('preloads TOPRF node details while provider login is pending', async () => {
    let resolveProviderLogin!: (
      value: ReturnType<typeof defaultLoginHandlerResponse>,
    ) => void;
    const providerLogin = new Promise<
      ReturnType<typeof defaultLoginHandlerResponse>
    >((resolve) => {
      resolveProviderLogin = resolve;
    });
    mockLoginHandlerResponse.mockReturnValue(providerLogin);
    const loginHandler = mockCreateLoginHandler();

    const loginPromise = OAuthLoginService.handleOAuthLogin(
      loginHandler,
      false,
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(mockPreloadToprfNodeDetails).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).not.toHaveBeenCalled();

    resolveProviderLogin(defaultLoginHandlerResponse());
    await loginPromise;
  });

  it('waits for TOPRF node details before seedless authentication', async () => {
    let resolvePreload!: () => void;
    const preloadPromise = new Promise<void>((resolve) => {
      resolvePreload = resolve;
    });
    mockPreloadToprfNodeDetails.mockReturnValue(preloadPromise);
    const loginHandler = mockCreateLoginHandler();

    const loginPromise = OAuthLoginService.handleOAuthLogin(
      loginHandler,
      false,
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockPreloadToprfNodeDetails).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockAuthenticate).not.toHaveBeenCalled();

    resolvePreload();
    await loginPromise;

    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('nests auth spans under the provided parent trace context', async () => {
    const loginHandler = mockCreateLoginHandler();
    const parentTraceContext = {
      _name: 'Onboarding - Social Login Attempt',
    } as unknown as TraceContext;

    await OAuthLoginService.handleOAuthLogin(
      loginHandler,
      false,
      parentTraceContext,
    );

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingOAuthProviderLogin,
        parentContext: parentTraceContext,
      }),
    );
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingOAuthBYOAServerGetAuthTokens,
        parentContext: parentTraceContext,
      }),
    );
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.OnboardingOAuthSeedlessAuthenticate,
        parentContext: parentTraceContext,
      }),
    );
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

  it('tracks SOCIAL_LOGIN_FAILED with new-user account_type when not rehydrating', async () => {
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
          resume_outcome: 'failed',
        }),
      }),
    );
  });

  it('does not track Social Login Failed for Android Google One Tap errors that fall back to browser', async () => {
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError(
        'No credential',
        OAuthErrorType.GoogleLoginNoCredential,
      );
    });

    await expect(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
    ).rejects.toMatchObject({ code: OAuthErrorType.GoogleLoginNoCredential });

    expect(analytics.trackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Failed',
      }),
    );

    Platform.OS = originalPlatform;
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
          resume_outcome: 'failed',
        }),
      }),
    );
  });

  it('tracks SOCIAL_LOGIN_AUTH_BROWSER_DISMISSED when provider login is dismissed', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError('Login dismissed', OAuthErrorType.UserDismissed);
    });

    await expect(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
    ).rejects.toMatchObject({ code: OAuthErrorType.UserDismissed });

    expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Auth Browser Dismissed',
        properties: expect.objectContaining({
          auth_connection: AuthConnection.Google,
          account_type: AccountType.MetamaskGoogle,
          surface: 'onboarding',
          elapsed_ms: expect.any(Number),
          resume_outcome: 'dismissed',
        }),
      }),
    );
    expect(analytics.trackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Failed',
      }),
    );
  });

  it('tracks SOCIAL_LOGIN_AUTH_BROWSER_DISMISSED for native provider cancel', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError('Login cancelled', OAuthErrorType.UserCancelled);
    });

    await expect(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
    ).rejects.toMatchObject({ code: OAuthErrorType.UserCancelled });

    expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Auth Browser Dismissed',
        properties: expect.objectContaining({
          auth_connection: AuthConnection.Google,
          account_type: AccountType.MetamaskGoogle,
          surface: 'onboarding',
          elapsed_ms: expect.any(Number),
          resume_outcome: 'dismissed',
        }),
      }),
    );
    expect(analytics.trackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Failed',
      }),
    );
  });

  it('tracks rehydration surface on SOCIAL_LOGIN_AUTH_BROWSER_DISMISSED when rehydrating', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError('Login cancelled', OAuthErrorType.UserCancelled);
    });

    await expect(
      OAuthLoginService.handleOAuthLogin(loginHandler, true),
    ).rejects.toMatchObject({ code: OAuthErrorType.UserCancelled });

    expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Auth Browser Dismissed',
        properties: expect.objectContaining({
          auth_connection: AuthConnection.Google,
          account_type: AccountType.ImportedGoogle,
          surface: 'rehydration',
          elapsed_ms: expect.any(Number),
          resume_outcome: 'dismissed',
        }),
      }),
    );
    expect(analytics.trackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Failed',
      }),
    );
  });

  it('tracks SOCIAL_LOGIN_AUTH_BROWSER_DISMISSED for provider cancel mapped to AppleLoginError', async () => {
    const loginHandler = mockCreateLoginHandler();
    mockLoginHandlerResponse.mockImplementation(() => {
      throw new OAuthError(
        'Apple login error - The user canceled the authorization attempt',
        OAuthErrorType.AppleLoginError,
      );
    });

    await expect(
      OAuthLoginService.handleOAuthLogin(loginHandler, false),
    ).rejects.toMatchObject({ code: OAuthErrorType.AppleLoginError });

    expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Auth Browser Dismissed',
      }),
    );
    expect(analytics.trackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Social Login Failed',
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

    it('exchanges QA mock tokens, calls seedless authenticate, and dispatches seedless onboarding', async () => {
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
        client_id: 'e2e-mock-google-client-id',
        login_provider: AuthConnection.Google,
        access_type: 'offline',
      });
      expect(body.email_id).toMatch(/^[a-f0-9]+\d+\+e2e@web3auth\.io$/);
      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
      expect(mockGetAuthTokens).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: SET_SEEDLESS_ONBOARDING,
        clientId: 'e2e-mock-google-client-id',
        authConnection: AuthConnection.Google,
      });
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

    it('rejects when QA mock response omits refresh_token (seedless authenticate requires it)', async () => {
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

      await expectOAuthError(
        OAuthLoginService.handleOAuthLogin(loginHandler, false),
        OAuthErrorType.LoginError,
      );

      expect(mockAuthenticate).not.toHaveBeenCalled();
    });

    it('calls provider login for email but skips getAuthTokens, and calls seedless authenticate', async () => {
      const loginHandler = mockCreateLoginHandler();

      await OAuthLoginService.handleOAuthLogin(loginHandler, false);

      expect(mockLoginHandlerResponse).toHaveBeenCalledTimes(1);
      expect(mockGetAuthTokens).not.toHaveBeenCalled();
      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: SET_SEEDLESS_ONBOARDING,
        clientId: 'e2e-mock-google-client-id',
        authConnection: AuthConnection.Google,
      });
    });
  });
});
