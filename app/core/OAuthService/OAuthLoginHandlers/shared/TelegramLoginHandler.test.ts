import { openAuthSessionAsync } from 'expo-web-browser';
import { TelegramLoginHandler } from './TelegramLoginHandler';
import { OAuthError, OAuthErrorType } from '../../error';
import { AuthConnection, type AuthResponse } from '../../OAuthInterface';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('../constants', () => ({
  TelegramAuthServerUrl: 'https://tg-auth.test',
  HydraTokenUrl: 'https://hydra.test/token',
  HydraClientId: 'hydra-cid',
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
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
  w3aAuthServerUrl: 'https://fallback-auth.test',
  clientId: 'test-telegram-client-id',
  web3AuthNetwork: Web3AuthNetwork.Mainnet,
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
        { createTask: false },
      );
    });

    it('throws UserCancelled on cancel', async () => {
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });

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
      expect(result.clientId).toBe('test-telegram-client-id');
      expect(result.redirectUri).toBe('metamask://oauth-tg');
      expect(typeof result.code).toBe('string');
      expect(result.code.length).toBeGreaterThan(0);
      expect(typeof result.codeVerifier).toBe('string');
      expect(openAuthSessionAsync).toHaveBeenCalled();
    });
  });

  describe('getAuthTokens', () => {
    const codeVerifierOnly = {
      authConnection: AuthConnection.Telegram,
      clientId: 'test-telegram-client-id',
      code: 'chal',
      codeVerifier: 'verifier',
      web3AuthNetwork: Web3AuthNetwork.Mainnet,
      redirectUri: 'metamask://oauth-tg',
    };

    it('throws when code_verifier is missing', async () => {
      const params = { ...codeVerifierOnly, codeVerifier: undefined };
      delete (params as { codeVerifier?: string }).codeVerifier;

      await expect(
        handler.getAuthTokens(params as never, baseOptions.w3aAuthServerUrl),
      ).rejects.toMatchObject({
        code: OAuthErrorType.InvalidGetAuthTokenParams,
      });
    });

    it('throws when verify response is not ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response('bad verify', { status: 502 }));

      await expect(
        handler.getAuthTokens(codeVerifierOnly, baseOptions.w3aAuthServerUrl),
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
        handler.getAuthTokens(codeVerifierOnly, baseOptions.w3aAuthServerUrl),
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
        handler.getAuthTokens(codeVerifierOnly, baseOptions.w3aAuthServerUrl),
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
        handler.getAuthTokens(codeVerifierOnly, baseOptions.w3aAuthServerUrl),
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
        baseOptions.w3aAuthServerUrl,
      );

      expect(out.account_name).toBe('Telegram myhandle');
      expect(getAuthTokensSpy).toHaveBeenCalledWith(
        { id_token: hydraAccess },
        'api/v1/oauth/mint',
        baseOptions.w3aAuthServerUrl,
      );
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
        baseOptions.w3aAuthServerUrl,
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
          clientId: 'test-telegram-client-id',
          web3AuthNetwork: Web3AuthNetwork.Mainnet,
          redirectUri: 'r',
        } as never),
      ).toThrow(OAuthError);
    });

    it('returns POST body parameters for Telegram code flow', () => {
      const data = handler.getAuthTokenRequestData({
        authConnection: AuthConnection.Telegram,
        clientId: 'test-telegram-client-id',
        code: 'chal',
        codeVerifier: 'pv',
        web3AuthNetwork: Web3AuthNetwork.Mainnet,
        redirectUri: 'metamask://oauth',
      });

      expect(data).toEqual({
        client_id: 'test-telegram-client-id',
        code: 'chal',
        login_provider: AuthConnection.Telegram,
        network: Web3AuthNetwork.Mainnet,
        code_verifier: 'pv',
        redirect_uri: 'metamask://oauth',
      });
    });
  });
});
