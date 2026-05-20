import { openAuthSessionAsync } from 'expo-web-browser';
import { AppState, Linking } from 'react-native';
import { TelegramLoginHandler } from './TelegramLoginHandler';
import { OAuthError, OAuthErrorType } from '../../error';
import { AuthConnection, type AuthResponse } from '../../OAuthInterface';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { Env as ProfileSyncEnv } from '@metamask/profile-sync-controller/sdk';

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn(),
  },
}));

/** Jest has no RN native QuickBase64; real fromByteArray calls global.base64FromArrayBuffer (undefined). */
jest.mock('react-native-quick-base64', () => ({
  fromByteArray: (uint8: Uint8Array) => Buffer.from(uint8).toString('base64'),
  toByteArray: (b64: string) => new Uint8Array(Buffer.from(b64, 'base64')),
}));

jest.mock('react-native-quick-crypto', () => ({
  randomBytes: jest
    .fn()
    .mockReturnValue(Buffer.alloc(32).fill(7) as unknown as Uint8Array),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue(new Uint8Array(32).fill(2)),
    }),
  }),
  randomUUID: jest.fn().mockReturnValue('fixed-telegram-nonce'),
}));

function makeJwt(payload: Record<string, string>): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url',
  );
  return `hdr.${payloadB64}.sig`;
}

const baseOptions = {
  authServerUrl: 'https://fallback-auth.test',
  web3AuthNetwork: Web3AuthNetwork.Mainnet,
  profileSyncEnv: ProfileSyncEnv.DEV,
};

function createMockAuthResponse(
  overrides: Partial<AuthResponse> = {},
): AuthResponse {
  return {
    id_token: 'minted-id-token',
    access_token: 'ignored',
    metadata_access_token: 'metadata-token',
    indexes: [],
    endpoints: {},
    refresh_token: 'r',
    revoke_token: 'v',
    ...overrides,
  };
}

describe('TelegramLoginHandler', () => {
  let handler: TelegramLoginHandler;
  let getAuthTokensSpy: jest.SpiedFunction<
    typeof import('../baseHandler').getAuthTokens
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    AppState.currentState = 'active';
    (AppState.addEventListener as jest.Mock).mockImplementation(() => ({
      remove: jest.fn(),
    }));
    (Linking.addEventListener as jest.Mock).mockImplementation(() => ({
      remove: jest.fn(),
    }));
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
    const baseHandlerModule =
      jest.requireActual<typeof import('../baseHandler')>('../baseHandler');
    getAuthTokensSpy = jest
      .spyOn(baseHandlerModule, 'getAuthTokens')
      .mockResolvedValue(createMockAuthResponse());
    handler = new TelegramLoginHandler({
      ...baseOptions,
      appRedirectUri: 'metamask://oauth-tg',
    });
  });

  afterEach(() => {
    getAuthTokensSpy.mockRestore();
  });

  it('exposes Telegram connection, PKCE scope, and mint path without leading slash', () => {
    expect(handler.authConnection).toBe(AuthConnection.Telegram);
    expect(handler.scope).toEqual(['openid']);
    expect(handler.authServerPath).toBe('api/v1/oauth/mint');
  });

  describe('loginWithAuthSession', () => {
    it('returns redirect url on success', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: 'metamask://oauth-tg?state=1',
      });

      await expect(
        handler.loginWithAuthSession('https://open.example'),
      ).resolves.toBe('metamask://oauth-tg?state=1');
      expect(openAuthSessionAsync).toHaveBeenCalledWith(
        'https://open.example',
        'metamask://oauth-tg',
        {
          createTask: false,
        },
      );
    });

    it('returns redirect url from Linking when auth session misses the success result', async () => {
      const remove = jest.fn();
      (Linking.addEventListener as jest.Mock).mockImplementation(
        (_eventName, callback) => {
          setTimeout(
            () => callback({ url: 'metamask://oauth-tg?state=linking' }),
            0,
          );
          return { remove };
        },
      );
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'dismiss',
      });

      await expect(handler.loginWithAuthSession('https://x')).resolves.toBe(
        'metamask://oauth-tg?state=linking',
      );
      expect(remove).toHaveBeenCalled();
    });

    it('returns redirect url from the initial URL fallback', async () => {
      (Linking.getInitialURL as jest.Mock).mockResolvedValue(
        'metamask://oauth-tg?state=initial',
      );
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'dismiss',
      });

      await expect(handler.loginWithAuthSession('https://x')).resolves.toBe(
        'metamask://oauth-tg?state=initial',
      );
    });

    it('throws UserCancelled on cancel', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'cancel',
      });

      await expect(
        handler.loginWithAuthSession('https://x'),
      ).rejects.toMatchObject({
        code: OAuthErrorType.UserCancelled,
      });
    });

    it('throws UserDismissed on dismiss', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'dismiss',
      });

      await expect(
        handler.loginWithAuthSession('https://x'),
      ).rejects.toMatchObject({
        code: OAuthErrorType.UserDismissed,
      });
    });

    it('throws TelegramLoginError for unknown result types', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'error',
        error: new Error('x'),
      });

      await expect(
        handler.loginWithAuthSession('https://x'),
      ).rejects.toMatchObject({
        code: OAuthErrorType.TelegramLoginError,
      });
    });
  });

  describe('login', () => {
    it('returns code challenge and metadata after auth session', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type: 'success',
        url: 'metamask://oauth-tg?ok=1',
      });

      const result = await handler.login();

      expect(result.authConnection).toBe(AuthConnection.Telegram);
      expect(result.clientId).toBe('telegram');
      expect(result.redirectUri).toBe('metamask://oauth-tg');
      expect(typeof result.code).toBe('string');
      expect(result.code.length).toBeGreaterThan(0);
      expect(typeof result.codeVerifier).toBe('string');
      const [authorizationUrl] = (openAuthSessionAsync as jest.Mock).mock
        .calls[0];
      const parsedAuthorizationUrl = new URL(authorizationUrl);
      expect(parsedAuthorizationUrl.origin).toBe(
        'https://authentication.dev-api.cx.metamask.io',
      );
      expect(parsedAuthorizationUrl.pathname).toBe(
        '/api/v2/telegram/login/initiate',
      );
      expect(parsedAuthorizationUrl.searchParams.get('client_id')).toBeNull();
      expect(parsedAuthorizationUrl.searchParams.get('state')).toBe(
        'fixed-telegram-nonce',
      );
      expect(parsedAuthorizationUrl.searchParams.get('app_redirect_uri')).toBe(
        'metamask://oauth-tg',
      );
      expect(
        parsedAuthorizationUrl.searchParams.get('code_challenge'),
      ).toBeTruthy();
    });
  });

  describe('getAuthTokens', () => {
    const codeVerifierOnly = {
      authConnection: AuthConnection.Telegram,
      clientId: 'telegram',
      code: 'chal',
      codeVerifier: 'verifier',
      web3AuthNetwork: Web3AuthNetwork.Mainnet,
      redirectUri: 'metamask://oauth-tg',
    };

    it('throws when code_verifier is missing', async () => {
      const params = { ...codeVerifierOnly, codeVerifier: undefined };
      delete (params as { codeVerifier?: string }).codeVerifier;

      await expect(
        handler.getAuthTokens(params as never, baseOptions.authServerUrl),
      ).rejects.toMatchObject({
        code: OAuthErrorType.InvalidGetAuthTokenParams,
      });
    });

    it('throws when verify response is not ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response('bad verify', { status: 502 }));

      await expect(
        handler.getAuthTokens(codeVerifierOnly, baseOptions.authServerUrl),
      ).rejects.toMatchObject({
        code: OAuthErrorType.AuthServerError,
      });
    });

    it('throws when verify JSON has no token', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ expires_in: 1 }), {
          status: 200,
        }),
      );

      await expect(
        handler.getAuthTokens(codeVerifierOnly, baseOptions.authServerUrl),
      ).rejects.toMatchObject({
        code: OAuthErrorType.LoginError,
      });
    });

    it('throws when Hydra token response is not ok', async () => {
      const verifyJwt = makeJwt({ tid: 'x' }); // decoded JSON has no idp_sub → generic account name branch
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: verifyJwt,
            expires_in: 3600,
            profile: {},
          }),
          { status: 200 },
        ),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response('hydra down', { status: 503 }),
      );

      await expect(
        handler.getAuthTokens(codeVerifierOnly, baseOptions.authServerUrl),
      ).rejects.toMatchObject({
        code: OAuthErrorType.AuthServerError,
      });
    });

    it('throws when Hydra JSON has no access_token', async () => {
      const verifyJwt = makeJwt({ idp_sub: 'tg-handle' });

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: verifyJwt,
            expires_in: 3600,
            profile: {},
          }),
          { status: 200 },
        ),
      );
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ token_type: 'Bearer' }), {
          status: 200,
        }),
      );

      await expect(
        handler.getAuthTokens(codeVerifierOnly, baseOptions.authServerUrl),
      ).rejects.toMatchObject({
        code: OAuthErrorType.LoginError,
      });
    });

    it('mints auth tokens and attaches Telegram display name from idp_sub', async () => {
      const verifyJwt = makeJwt({ idp_sub: 'myhandle' });
      const hydraAccess = 'hydra-access-xyz';

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: verifyJwt,
            expires_in: 3600,
            profile: {},
          }),
          { status: 200 },
        ),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: hydraAccess,
            expires_in: 3600,
            scope: 'openid',
            token_type: 'Bearer',
          }),
          { status: 200 },
        ),
      );

      getAuthTokensSpy.mockResolvedValueOnce(
        createMockAuthResponse({
          id_token: 'final-id',
          access_token: 'a',
          indexes: [1],
        }),
      );

      const out = await handler.getAuthTokens(
        codeVerifierOnly,
        baseOptions.authServerUrl,
      );

      expect(out.account_name).toBe('Telegram myhandle');
      expect(fetchSpy.mock.calls[0][0]).toBe(
        'https://authentication.dev-api.cx.metamask.io/api/v2/telegram/login/verify',
      );
      expect(fetchSpy.mock.calls[1][0]).toBe(
        'https://oidc.dev-api.cx.metamask.io/oauth2/token',
      );
      const [, hydraRequestOptions] = fetchSpy.mock.calls[1];
      expect(hydraRequestOptions).toMatchObject({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const hydraBody = new URLSearchParams(
        hydraRequestOptions?.body as string,
      );
      expect(hydraBody.get('grant_type')).toBe(
        'urn:ietf:params:oauth:grant-type:jwt-bearer',
      );
      expect(hydraBody.get('client_id')).toBeTruthy();
      expect(hydraBody.get('assertion')).toBe(verifyJwt);
      expect(getAuthTokensSpy).toHaveBeenCalledWith(
        { id_token: hydraAccess },
        'api/v1/oauth/mint',
        baseOptions.authServerUrl,
      );
    });

    it('retries verify once when the first verify request fails at the network layer', async () => {
      const verifyJwt = makeJwt({ idp_sub: 'retry-handle' });
      const hydraAccess = 'hydra-access-after-retry';

      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              token: verifyJwt,
              expires_in: 3600,
              profile: {},
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: hydraAccess,
              expires_in: 3600,
              scope: 'openid',
              token_type: 'Bearer',
            }),
            { status: 200 },
          ),
        );

      getAuthTokensSpy.mockResolvedValueOnce(
        createMockAuthResponse({ id_token: 'id', access_token: 'a' }),
      );

      const out = await handler.getAuthTokens(
        codeVerifierOnly,
        baseOptions.authServerUrl,
      );

      expect(out.account_name).toBe('Telegram retry-handle');
      expect(fetchSpy).toHaveBeenNthCalledWith(
        1,
        'https://authentication.dev-api.cx.metamask.io/api/v2/telegram/login/verify',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        'https://authentication.dev-api.cx.metamask.io/api/v2/telegram/login/verify',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        3,
        'https://oidc.dev-api.cx.metamask.io/oauth2/token',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(getAuthTokensSpy).toHaveBeenCalledWith(
        { id_token: hydraAccess },
        'api/v1/oauth/mint',
        baseOptions.authServerUrl,
      );
    });

    it('retries mint through the shared retry helper', async () => {
      const verifyJwt = makeJwt({ idp_sub: 'mint-retry-handle' });
      const hydraAccess = 'hydra-access-before-mint-retry';

      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              token: verifyJwt,
              expires_in: 3600,
              profile: {},
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: hydraAccess,
              expires_in: 3600,
              scope: 'openid',
              token_type: 'Bearer',
            }),
            { status: 200 },
          ),
        );

      getAuthTokensSpy
        .mockRejectedValueOnce(new Error('temporary mint failure'))
        .mockResolvedValueOnce(
          createMockAuthResponse({ id_token: 'id', access_token: 'a' }),
        );

      const out = await handler.getAuthTokens(
        codeVerifierOnly,
        baseOptions.authServerUrl,
      );

      expect(out.account_name).toBe('Telegram mint-retry-handle');
      expect(getAuthTokensSpy).toHaveBeenCalledTimes(2);
    });

    it('waits for active app state before verify', async () => {
      const remove = jest.fn();
      AppState.currentState = 'background';
      (AppState.addEventListener as jest.Mock).mockImplementation(
        (_eventName, callback) => {
          setTimeout(() => {
            AppState.currentState = 'active';
            callback('active');
          }, 0);
          return { remove };
        },
      );

      const verifyJwt = makeJwt({ idp_sub: 'active-handle' });
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              token: verifyJwt,
              expires_in: 3600,
              profile: {},
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: 'hydra-access',
              expires_in: 3600,
              scope: 'openid',
              token_type: 'Bearer',
            }),
            { status: 200 },
          ),
        );

      getAuthTokensSpy.mockResolvedValueOnce(
        createMockAuthResponse({ id_token: 'id', access_token: 'a' }),
      );

      await expect(
        handler.getAuthTokens(codeVerifierOnly, baseOptions.authServerUrl),
      ).resolves.toMatchObject({ account_name: 'Telegram active-handle' });

      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
      expect(remove).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('does not retry verify for non-network errors', async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Unexpected verify failure'));

      await expect(
        handler.getAuthTokens(codeVerifierOnly, baseOptions.authServerUrl),
      ).rejects.toThrow('Unexpected verify failure');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('uses generic Telegram account label when idp_sub is absent', async () => {
      const verifyJwt = makeJwt({});

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: verifyJwt,
            expires_in: 3600,
            profile: {},
          }),
          { status: 200 },
        ),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'hydra-access',
            expires_in: 3600,
            scope: 'openid',
            token_type: 'Bearer',
          }),
          { status: 200 },
        ),
      );

      getAuthTokensSpy.mockResolvedValueOnce(
        createMockAuthResponse({ id_token: 'id', access_token: 'a' }),
      );

      const out = await handler.getAuthTokens(
        codeVerifierOnly,
        baseOptions.authServerUrl,
      );

      expect(out.account_name).toBe('Telegram account');
    });
  });

  describe('getAuthTokenRequestData', () => {
    it('throws when code is not present on params', () => {
      expect(() =>
        handler.getAuthTokenRequestData({
          idToken: 'x',
          authConnection: AuthConnection.Telegram,
          clientId: 'telegram',
          web3AuthNetwork: Web3AuthNetwork.Mainnet,
          redirectUri: 'r',
        } as never),
      ).toThrow(OAuthError);
    });

    it('returns POST body parameters for Telegram code flow', () => {
      const data = handler.getAuthTokenRequestData({
        authConnection: AuthConnection.Telegram,
        clientId: 'telegram',
        code: 'chal',
        codeVerifier: 'pv',
        web3AuthNetwork: Web3AuthNetwork.Mainnet,
        redirectUri: 'metamask://oauth',
      });

      expect(data).toEqual({
        client_id: 'telegram',
        code: 'chal',
        login_provider: AuthConnection.Telegram,
        network: Web3AuthNetwork.Mainnet,
        code_verifier: 'pv',
        redirect_uri: 'metamask://oauth',
      });
    });
  });
});
