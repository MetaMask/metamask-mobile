import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { signInAsync } from 'expo-apple-authentication';
import { AuthRequest, exchangeCodeAsync } from 'expo-auth-session';
import { signInWithGoogle } from '@metamask/react-native-acm';
import { IosAppleLoginHandler } from './iosHandlers/apple';
import { IosGoogleLoginHandler } from './iosHandlers/google';
import { AndroidGoogleLoginHandler } from './androidHandlers/google';
import { AndroidGoogleFallbackLoginHandler } from './androidHandlers/googleFallback';
import { AndroidAppleLoginHandler } from './androidHandlers/apple';
import { AuthConnection } from '../OAuthInterface';
import { OAuthErrorType } from '../error';

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
}));

jest.mock('@metamask/react-native-acm', () => ({
  signInWithGoogle: jest.fn(),
}));

jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  IosGID: 'ios-native-client-id',
  IosGoogleRedirectUri: 'ios-native-redirect-uri',
}));

const mockPromptAsync = jest.fn();
jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn().mockImplementation(() => ({
    promptAsync: (...args: unknown[]) => mockPromptAsync(...args),
    codeVerifier: 'mock-code-verifier',
  })),
  CodeChallengeMethod: { S256: 'S256' },
  Prompt: { SelectAccount: 'select_account' },
  ResponseType: { Code: 'code' },
  exchangeCodeAsync: jest.fn(),
}));

const BASE_OPTIONS = {
  authServerUrl: 'https://auth.example.com',
  web3AuthNetwork: Web3AuthNetwork.Mainnet,
};

const NONCE = 'caller-nonce-hex';

describe('BaseLoginHandler nonce option', () => {
  it('uses the caller-supplied nonce when provided', () => {
    const handler = new IosAppleLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'apple-client-id',
      nonce: NONCE,
    });

    expect(handler.nonce).toBe(NONCE);
  });

  it('generates a random nonce when none is provided', () => {
    const first = new IosAppleLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'apple-client-id',
    });
    const second = new IosAppleLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'apple-client-id',
    });

    expect(first.nonce).toEqual(expect.any(String));
    expect(first.nonce).not.toBe(second.nonce);
  });

  it('rejects getProviderIdToken on handlers without provider token support', async () => {
    const handler = new AndroidGoogleFallbackLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'google-client-id',
      redirectUri: 'redirect-uri',
    });

    await expect(handler.getProviderIdToken()).rejects.toMatchObject({
      code: 'social_sign_in_unavailable',
    });
  });

  it('rejects getProviderIdToken on Android Apple', async () => {
    const handler = new AndroidAppleLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'apple-client-id',
      appRedirectUri: 'redirect-uri',
    });

    await expect(handler.getProviderIdToken()).rejects.toMatchObject({
      code: 'social_sign_in_unavailable',
    });
  });
});

describe('IosAppleLoginHandler.getProviderIdToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs in with the handler nonce and returns the identity token', async () => {
    (signInAsync as jest.Mock).mockResolvedValue({
      identityToken: 'apple-identity-token',
    });
    const handler = new IosAppleLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'apple-client-id',
      nonce: NONCE,
    });

    const token = await handler.getProviderIdToken();

    expect(signInAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: NONCE }),
    );
    expect(token).toBe('apple-identity-token');
    expect(handler.authConnection).toBe(AuthConnection.Apple);
  });

  it('throws when Apple returns no identity token', async () => {
    (signInAsync as jest.Mock).mockResolvedValue({ identityToken: null });
    const handler = new IosAppleLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'apple-client-id',
      nonce: NONCE,
    });

    await expect(handler.getProviderIdToken()).rejects.toThrow(
      'Missing identity token',
    );
  });
});

describe('AndroidGoogleLoginHandler.getProviderIdToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs Credential Manager with the handler nonce and returns the ID token', async () => {
    (signInWithGoogle as jest.Mock).mockResolvedValue({
      type: 'google-signin',
      idToken: 'google-id-token',
    });
    const handler = new AndroidGoogleLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'google-web-client-id',
      nonce: NONCE,
    });

    const token = await handler.getProviderIdToken();

    expect(signInWithGoogle).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: NONCE }),
    );
    expect(token).toBe('google-id-token');
  });
});

describe('IosGoogleLoginHandler.getProviderIdToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the native iOS client, sends the nonce, and exchanges the code for Google ID token', async () => {
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'auth-code' },
    });
    (exchangeCodeAsync as jest.Mock).mockResolvedValue({
      idToken: 'google-ios-id-token',
    });
    const handler = new IosGoogleLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'ios-client-id',
      redirectUri: 'ios-redirect-uri',
      nonce: NONCE,
    });

    const token = await handler.getProviderIdToken();

    expect(AuthRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'ios-native-client-id',
        redirectUri: 'ios-native-redirect-uri',
        extraParams: { nonce: NONCE },
      }),
    );
    expect(exchangeCodeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'ios-native-client-id',
        code: 'auth-code',
        redirectUri: 'ios-native-redirect-uri',
        extraParams: { code_verifier: 'mock-code-verifier' },
      }),
      expect.objectContaining({
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      }),
    );
    expect(token).toBe('google-ios-id-token');
  });

  it('throws UserCancelled when the browser flow is cancelled', async () => {
    mockPromptAsync.mockResolvedValue({ type: 'cancel' });
    const handler = new IosGoogleLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'ios-client-id',
      redirectUri: 'ios-redirect-uri',
      nonce: NONCE,
    });

    await expect(handler.getProviderIdToken()).rejects.toMatchObject({
      code: OAuthErrorType.UserCancelled,
    });
    expect(exchangeCodeAsync).not.toHaveBeenCalled();
  });

  it('throws when Google returns no ID token', async () => {
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'auth-code' },
    });
    (exchangeCodeAsync as jest.Mock).mockResolvedValue({});
    const handler = new IosGoogleLoginHandler({
      ...BASE_OPTIONS,
      clientId: 'ios-client-id',
      redirectUri: 'ios-redirect-uri',
      nonce: NONCE,
    });

    await expect(handler.getProviderIdToken()).rejects.toThrow(
      'Missing ID token in token response',
    );
  });
});
