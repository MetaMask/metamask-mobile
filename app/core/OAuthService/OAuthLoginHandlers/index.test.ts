import { Platform } from 'react-native';
import { AuthConnection, HandleFlowParams } from '../OAuthInterface';
import { createLoginHandler } from './index';
import { OAuthError, OAuthErrorType } from '../error';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

const mockExpoAuthSessionPromptAsync = jest.fn().mockResolvedValue({
  type: 'success',
  params: {
    code: 'googleCode',
  },
});

jest.mock('./constants', () => ({
  AuthServerUrl: 'https://auth.example.com',
  AppRedirectUri: 'https://app.example.com',
  IosGID: 'mock-ios-google-client-id',
  IosGoogleRedirectUri: 'mock-ios-google-redirect-uri',
  AndroidGoogleWebGID: 'mock-android-google-client-id',
  AppleWebClientId: 'mock-android-apple-client-id',
  AppleServerRedirectUri: 'https://auth.example.com/api/v1/oauth/callback',
}));

jest.mock('expo-auth-session', () => ({
  AuthRequest: () => ({
    promptAsync: mockExpoAuthSessionPromptAsync,
    makeAuthUrlAsync: jest.fn().mockResolvedValue({
      url: 'https://example.com',
    }),
  }),
  CodeChallengeMethod: jest.fn(),
  ResponseType: jest.fn(),
}));

const mockSignInAsync = jest.fn().mockResolvedValue({
  identityToken: 'appleIdToken',
});
jest.mock('expo-apple-authentication', () => ({
  signInAsync: () => mockSignInAsync(),
  AppleAuthenticationScope: {
    FULL_NAME: 'full_name',
    EMAIL: 'email',
  },
}));

const mockRandomUUID = jest.fn();
jest.mock('react-native-quick-crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(new Uint8Array(32)),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue(new Uint8Array(32)),
    }),
  }),
  randomUUID: () => mockRandomUUID(),
}));

const mockSignInWithGoogle = jest.fn().mockResolvedValue({
  type: 'google-signin',
  idToken: 'googleIdToken',
});
jest.mock('@metamask/react-native-acm', () => ({
  signInWithGoogle: () => mockSignInWithGoogle(),
}));

describe('OAuth login handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  for (const os of ['ios', 'android']) {
    for (const provider of Object.values(AuthConnection)) {
      it(`creates the correct login handler for ${os} and ${provider}`, async () => {
        const handler = createLoginHandler(os as Platform['OS'], provider);
        const result = await handler.login();

        expect(result?.authConnection).toBe(provider);

        switch (os) {
          case 'ios': {
            switch (provider) {
              case AuthConnection.Apple:
                expect(mockExpoAuthSessionPromptAsync).toHaveBeenCalledTimes(0);
                expect(mockSignInWithGoogle).toHaveBeenCalledTimes(0);
                expect(mockSignInAsync).toHaveBeenCalledTimes(1);
                break;
              case AuthConnection.Google:
                expect(mockExpoAuthSessionPromptAsync).toHaveBeenCalledTimes(1);
                expect(mockSignInWithGoogle).toHaveBeenCalledTimes(0);
                expect(mockSignInAsync).toHaveBeenCalledTimes(0);
                break;
            }
            break;
          }
          case 'android': {
            switch (provider) {
              case AuthConnection.Apple:
                expect(mockExpoAuthSessionPromptAsync).toHaveBeenCalledTimes(1);
                expect(mockSignInWithGoogle).toHaveBeenCalledTimes(0);
                expect(mockSignInAsync).toHaveBeenCalledTimes(0);
                break;
              case AuthConnection.Google:
                expect(mockExpoAuthSessionPromptAsync).toHaveBeenCalledTimes(0);
                expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
                expect(mockSignInAsync).toHaveBeenCalledTimes(0);
                break;
            }
            break;
          }
        }
      });

      it(`has correct scope and authServerPath for ${os} ${provider} handler`, async () => {
        const handler = createLoginHandler(os as Platform['OS'], provider);

        switch (os) {
          case 'ios': {
            switch (provider) {
              case AuthConnection.Apple:
                expect(handler.scope).toEqual(['full_name', 'email']);
                expect(handler.authServerPath).toBe('api/v1/oauth/id_token');
                break;
              case AuthConnection.Google:
                expect(handler.scope).toEqual(['email', 'profile', 'openid']);
                expect(handler.authServerPath).toBe('api/v1/oauth/token');
                break;
            }
            break;
          }
          case 'android': {
            switch (provider) {
              case AuthConnection.Apple:
                expect(handler.scope).toEqual(['name', 'email']);
                // Apple BBF flow
                expect(handler.authServerPath).toBe(
                  'api/v1/oauth/callback/verify',
                );
                break;
              case AuthConnection.Google:
                expect(handler.scope).toEqual(['email', 'profile', 'openid']);
                expect(handler.authServerPath).toBe('api/v1/oauth/id_token');
                break;
            }
            break;
          }
        }

        jest.spyOn(global, 'fetch').mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: 'access-token',
              metadata_access_token: 'metadata-access-token',
              refresh_token: 'refresh-token',
              revoke_token: 'revoke-token',
              id_token: 'id-token',
              indexes: [1, 2, 3],
              endpoints: {
                'https://example.com': 'https://endpoint.example.com',
              },
            }),
            {
              status: 200,
            },
          ),
        );

        const mockAuthTokenParams: HandleFlowParams = {
          idToken: 'id-token',
          code: 'code',
          authConnection: provider,
          clientId: 'mock-client-id',
          web3AuthNetwork: Web3AuthNetwork.Mainnet,
        };

        const authTokens = await handler.getAuthTokens(
          mockAuthTokenParams as HandleFlowParams,
          'https://auth.example.com',
        );

        expect(authTokens).toBeDefined();
      });
    }
  }

  describe('Android Google with fallback', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates browser-based fallback handler when fallback is true', async () => {
      const handler = createLoginHandler(
        'android',
        AuthConnection.Google,
        true,
      );
      const result = await handler.login();

      expect(result?.authConnection).toBe(AuthConnection.Google);
      expect(mockExpoAuthSessionPromptAsync).toHaveBeenCalledTimes(1);
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(0);
    });

    it('uses ACM handler when fallback is false (default)', async () => {
      const handler = createLoginHandler(
        'android',
        AuthConnection.Google,
        false,
      );
      const result = await handler.login();

      expect(result?.authConnection).toBe(AuthConnection.Google);
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
      expect(mockExpoAuthSessionPromptAsync).toHaveBeenCalledTimes(0);
    });

    it('has correct scope and authServerPath for fallback handler', async () => {
      const handler = createLoginHandler(
        'android',
        AuthConnection.Google,
        true,
      );

      expect(handler.scope).toEqual(['email', 'profile', 'openid']);
      // Fallback uses token endpoint (code flow)
      expect(handler.authServerPath).toBe('api/v1/oauth/token');
    });
  });

  describe('Error handling', () => {
    describe('iOS Apple handler', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('throw UserCancelled error when user cancels', async () => {
        mockSignInAsync.mockRejectedValue(
          new Error('The user canceled the authorization attempt'),
        );

        const handler = createLoginHandler('ios', AuthConnection.Apple);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(OAuthErrorType.UserCancelled);
          expect((error as OAuthError).message).toContain(
            'handleIosAppleLogin: User canceled the authorization attempt',
          );
        }
      });

      it('throw UnknownError for other errors', async () => {
        mockSignInAsync.mockRejectedValue(new Error('Network error'));

        const handler = createLoginHandler('ios', AuthConnection.Apple);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(
            OAuthErrorType.AppleLoginError,
          );
        }
      });

      it('throw UnknownError when no identity token is returned', async () => {
        mockSignInAsync.mockResolvedValue({ identityToken: null });

        const handler = createLoginHandler('ios', AuthConnection.Apple);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(
            OAuthErrorType.AppleLoginError,
          );
        }
      });

      it('re-throw existing OAuthError instances', async () => {
        const existingError = new OAuthError(
          'Test error',
          OAuthErrorType.LoginError,
        );
        mockSignInAsync.mockRejectedValue(existingError);

        const handler = createLoginHandler('ios', AuthConnection.Apple);

        await expect(handler.login()).rejects.toThrow(existingError);
      });
    });

    describe('iOS Google handler', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('throw UserCancelled error when user cancels', async () => {
        mockExpoAuthSessionPromptAsync.mockResolvedValue({
          type: 'cancel',
        });

        const handler = createLoginHandler('ios', AuthConnection.Google);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(OAuthErrorType.UserCancelled);
          expect((error as OAuthError).message).toContain(
            'User cancelled - IosGoogleLoginHandler: User cancelled the login process',
          );
        }
      });

      it('throw UserDismissed error when user dismisses', async () => {
        mockExpoAuthSessionPromptAsync.mockResolvedValue({
          type: 'dismiss',
        });

        const handler = createLoginHandler('ios', AuthConnection.Google);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(OAuthErrorType.UserDismissed);
          expect((error as OAuthError).message).toContain(
            'User dismissed - IosGoogleLoginHandler: User dismissed the login process',
          );
        }
      });

      it('throw UnknownError for other result types', async () => {
        mockExpoAuthSessionPromptAsync.mockResolvedValue({
          type: 'error',
          error: 'Some error',
        });

        const handler = createLoginHandler('ios', AuthConnection.Google);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(
            OAuthErrorType.GoogleLoginError,
          );
        }
      });

      it('throw error when promptAsync throws exception', async () => {
        mockExpoAuthSessionPromptAsync.mockRejectedValue(
          new Error('Network error'),
        );

        const handler = createLoginHandler('ios', AuthConnection.Google);

        await expect(handler.login()).rejects.toThrow('Network error');
      });
    });

    describe('Android Apple handler', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('throw UserCancelled error when user cancels', async () => {
        mockExpoAuthSessionPromptAsync.mockResolvedValue({
          type: 'cancel',
        });

        const handler = createLoginHandler('android', AuthConnection.Apple);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(OAuthErrorType.UserCancelled);
          expect((error as OAuthError).message).toContain(
            'User cancelled - handleAndroidAppleLogin: User cancelled the login process',
          );
        }
      });

      it('throw UserDismissed error when user dismisses', async () => {
        mockExpoAuthSessionPromptAsync.mockResolvedValue({
          type: 'dismiss',
        });

        const handler = createLoginHandler('android', AuthConnection.Apple);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(OAuthErrorType.UserDismissed);
          expect((error as OAuthError).message).toContain(
            'User dismissed - handleAndroidAppleLogin: User dismissed the login process',
          );
        }
      });

      it('throw LoginError when error with message is returned', async () => {
        mockExpoAuthSessionPromptAsync.mockResolvedValue({
          type: 'error',
          error: { message: 'Authentication failed' },
        });

        const handler = createLoginHandler('android', AuthConnection.Apple);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(OAuthErrorType.LoginError);
          expect((error as OAuthError).message).toContain(
            'Login error - Authentication failed',
          );
        }
      });

      it('throw UnknownError when error without message is returned', async () => {
        mockExpoAuthSessionPromptAsync.mockResolvedValue({
          type: 'error',
          error: null,
        });

        const handler = createLoginHandler('android', AuthConnection.Apple);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(
            OAuthErrorType.AppleLoginError,
          );
        }
      });

      it('throw UnknownError for unexpected result types', async () => {
        mockExpoAuthSessionPromptAsync.mockResolvedValue({
          type: 'unknown',
        });

        const handler = createLoginHandler('android', AuthConnection.Apple);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(
            OAuthErrorType.AppleLoginError,
          );
        }
      });

      it('throw error when promptAsync throws exception', async () => {
        mockExpoAuthSessionPromptAsync.mockRejectedValue(
          new Error('Network error'),
        );

        const handler = createLoginHandler('android', AuthConnection.Apple);

        await expect(handler.login()).rejects.toThrow('Network error');
      });
    });

    describe('Android Google handler', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('throw UserCancelled error when user cancels', async () => {
        mockSignInWithGoogle.mockRejectedValue(new Error('User cancelled'));

        const handler = createLoginHandler('android', AuthConnection.Google);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(OAuthErrorType.UserCancelled);
          expect((error as OAuthError).message).toContain(
            'User cancelled - handleGoogleLogin: User cancelled the login process',
          );
        }
      });

      it('throw UnknownError for other errors', async () => {
        mockSignInWithGoogle.mockRejectedValue(new Error('Network error'));

        const handler = createLoginHandler('android', AuthConnection.Google);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(OAuthErrorType.UnknownError);
          expect((error as OAuthError).message).toContain(
            'Unknown error - Error: Network error',
          );
        }
      });

      it('throw UnknownError when result type is not google-signin', async () => {
        mockSignInWithGoogle.mockResolvedValue({
          type: 'unknown',
        });

        const handler = createLoginHandler('android', AuthConnection.Google);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(OAuthErrorType.UnknownError);
          expect((error as OAuthError).message).toContain(
            'Unknown error - handleGoogleLogin: Unknown error',
          );
        }
      });

      // no credentials
      it('throw GoogleLoginNoCredential when no credentials are found', async () => {
        const message = 'e1 error Mo.m: No credential available';
        mockSignInWithGoogle.mockRejectedValue(new Error(message));

        const handler = createLoginHandler('android', AuthConnection.Google);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(
            OAuthErrorType.GoogleLoginNoCredential,
          );
          expect((error as OAuthError).message).toContain(
            `Google login has no credential - handleGoogleLogin: Google login has no credential`,
          );
        }
      });

      // retry successfy when there is only once no credentials
      it('verify successful login after a retry when no credentials are found on the first attempt', async () => {
        const message = 'e1 error Mo.m: No credential available';
        mockSignInWithGoogle.mockClear();
        mockSignInWithGoogle.mockResolvedValue({
          type: 'google-signin',
          idToken: 'googleIdToken',
        });
        mockSignInWithGoogle.mockRejectedValueOnce(new Error(message));

        const handler = createLoginHandler('android', AuthConnection.Google);
        await handler.login();

        expect(mockSignInWithGoogle).toHaveBeenCalledTimes(2);
        expect(mockSignInAsync).toHaveBeenCalledTimes(0);
      });

      it('throw GoogleLoginNoMatchingCredential when no matching credential is found', async () => {
        const message =
          'During begin signin, failure response from one tap. 16: [28433] Cannot find matching credential error';
        mockSignInWithGoogle.mockRejectedValue(new Error(message));

        const handler = createLoginHandler('android', AuthConnection.Google);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(
            OAuthErrorType.GoogleLoginNoMatchingCredential,
          );
          expect((error as OAuthError).message).toContain(
            `Google login has no matching credential - handleGoogleLogin: Google login has no matching credential`,
          );
        }
      });

      // retry successfy when there is only once no credentials
      it('verify successful login after a retry when no matching credential is found on the first attempt', async () => {
        const message =
          'During begin signin, failure response from one tap. 16: [28433] Cannot find matching credential error';
        mockSignInWithGoogle.mockClear();
        mockSignInWithGoogle.mockResolvedValue({
          type: 'google-signin',
          idToken: 'googleIdToken',
        });
        mockSignInWithGoogle.mockRejectedValueOnce(new Error(message));

        const handler = createLoginHandler('android', AuthConnection.Google);
        await handler.login();

        expect(mockSignInWithGoogle).toHaveBeenCalledTimes(2);
        expect(mockSignInAsync).toHaveBeenCalledTimes(0);
      });

      it('re-throw existing OAuthError instances', async () => {
        const existingError = new OAuthError(
          'Test error',
          OAuthErrorType.LoginError,
        );
        mockSignInWithGoogle.mockRejectedValue(existingError);

        const handler = createLoginHandler('android', AuthConnection.Google);

        await expect(handler.login()).rejects.toThrow(existingError);
      });

      // One Tap failure tests
      it('throw GoogleLoginOneTapFailure when one tap fails without matching credential error', async () => {
        // This message contains "failure response from one tap" but NOT "matching credential"
        const message =
          'During begin signin, failure response from one tap. 16: [28434] Unknown error';
        mockSignInWithGoogle.mockRejectedValue(new Error(message));

        const handler = createLoginHandler('android', AuthConnection.Google);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          expect((error as OAuthError).code).toBe(
            OAuthErrorType.GoogleLoginOneTapFailure,
          );
          // Error message should include original error context for debugging
          expect((error as OAuthError).message).toContain(
            'Google login one tap failure',
          );
          expect((error as OAuthError).message).toContain(message);
        }
      });

      it('throw GoogleLoginNoMatchingCredential (not OneTapFailure) when message contains both patterns', async () => {
        // This message contains BOTH "failure response from one tap" AND "matching credential"
        // NO_MATCHING_CREDENTIAL should take precedence due to check order
        const message =
          'During begin signin, failure response from one tap. 16: [28433] Cannot find matching credential error';
        mockSignInWithGoogle.mockRejectedValue(new Error(message));

        const handler = createLoginHandler('android', AuthConnection.Google);
        try {
          await handler.login();
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthError);
          // Should be NO_MATCHING_CREDENTIAL, not ONE_TAP_FAILURE, due to check order
          expect((error as OAuthError).code).toBe(
            OAuthErrorType.GoogleLoginNoMatchingCredential,
          );
        }
      });

      it('verify successful login after a retry when one tap failure occurs on the first attempt', async () => {
        const message =
          'During begin signin, failure response from one tap. 16: [28434] Unknown error';
        mockSignInWithGoogle.mockClear();
        mockSignInWithGoogle.mockResolvedValue({
          type: 'google-signin',
          idToken: 'googleIdToken',
        });
        mockSignInWithGoogle.mockRejectedValueOnce(new Error(message));

        const handler = createLoginHandler('android', AuthConnection.Google);
        await handler.login();

        expect(mockSignInWithGoogle).toHaveBeenCalledTimes(2);
        expect(mockSignInAsync).toHaveBeenCalledTimes(0);
      });
    });
  });
});
