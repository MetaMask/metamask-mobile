import { openAuthSessionAsync } from 'expo-web-browser';
import {
  AuthConnection,
  AuthRequestParams,
  AuthResponse,
  HandleFlowParams,
  LoginHandlerCodeResult,
} from '../../OAuthInterface';
import {
  BaseHandlerOptions,
  BaseLoginHandler,
  getAuthTokens as requestAuthTokens,
} from '../baseHandler';
import { OAuthError, OAuthErrorType } from '../../error';
import {
  TelegramMintPath,
  TelegramAuthServerUrl,
  TelegramAuthServerInitiatePath,
  TelegramAuthServerVerifyPath,
  TelegramHydraTokenUrl,
  TelegramHydraClientId,
} from '../constants';

export interface TelegramLoginHandlerParams extends BaseHandlerOptions {
  appRedirectUri: string;
}

interface TelegramVerifyResponse {
  expires_in: number;
  profile: {
    created_at: string;
    identifier_id: string;
    identifier_type: string;
    paired_identifier_ids?: unknown[];
    profile_id: string;
  };
  token: string;
}

interface TelegramVerifyTokenPayload {
  idp_sub?: string;
  sub?: string;
}

interface TelegramHydraTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export class TelegramLoginHandler extends BaseLoginHandler {
  readonly #scope = ['openid'];
  protected clientId = 'telegram';
  protected redirectUri: string;

  get authConnection() {
    return AuthConnection.Telegram;
  }

  get scope() {
    return this.#scope;
  }

  get authServerPath() {
    return TelegramMintPath.replace(/^\//, '');
  }

  constructor(params: TelegramLoginHandlerParams) {
    super(params);
    this.redirectUri = params.appRedirectUri;
  }

  /**
   * Opens the Telegram login flow via a Chrome Custom Tab / Safari View Controller.
   *
   * The backend-mediated flow:
   * 1. Browser opens GET /api/v2/telegram/login/initiate?code_challenge=<...>&app_redirect_uri=<...>
   * 2. Backend 302s to Telegram, user authenticates
   * 3. Backend exchanges Telegram code, stores tokens keyed by code_challenge
   * 4. Backend 302s to app_redirect_uri?code_challenge=<challenge>
   * 5. App intercepts deep link — promptAsync resolves with success
   *
   * @returns LoginHandlerCodeResult with codeVerifier for the verify step
   */
  async login(): Promise<LoginHandlerCodeResult> {
    const { codeVerifier, challenge } = this.generateCodeVerifierChallenge();
    const initiateUrl = new URL(
      `${TelegramAuthServerUrl || this.options.authServerUrl}${TelegramAuthServerInitiatePath}`,
    );

    initiateUrl.searchParams.set('client_id', this.clientId);
    initiateUrl.searchParams.set('response_type', 'code');
    initiateUrl.searchParams.set('scope', this.#scope.join(' '));
    initiateUrl.searchParams.set('state', this.nonce);
    initiateUrl.searchParams.set('redirect_uri', this.redirectUri);
    initiateUrl.searchParams.set('app_redirect_uri', this.redirectUri);
    initiateUrl.searchParams.set('code_challenge', challenge);

    await this.loginWithAuthSession(initiateUrl.toString());

    return {
      authConnection: this.authConnection,
      code: challenge,
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      codeVerifier,
    };
  }

  async loginWithAuthSession(authorizationUrl: string): Promise<string> {
    const result = await openAuthSessionAsync(
      authorizationUrl,
      this.redirectUri,
      {
        createTask: true,
        showInRecents: true,
        useProxyActivity: true,
      },
    );

    if (result.type === 'success') {
      return result.url;
    }

    if (result.type === 'cancel') {
      throw new OAuthError(
        'TelegramLoginHandler: User cancelled the login process',
        OAuthErrorType.UserCancelled,
      );
    }

    if (result.type === 'dismiss') {
      throw new OAuthError(
        'TelegramLoginHandler: User dismissed the login process',
        OAuthErrorType.UserDismissed,
      );
    }

    throw new OAuthError(
      'TelegramLoginHandler: Unknown error',
      OAuthErrorType.TelegramLoginError,
    );
  }

  /**
   * Exchanges the PKCE code_verifier for the Telegram OIDC token via the verify endpoint,
   * exchanges that token through Hydra's JWT bearer grant,
   * then mints the standard auth-service token set used by seedless onboarding.
   *
   * The backend recomputes sha256(code_verifier) == code_challenge, consumes
   * the stored one-time login record, and returns the full auth response.
   * This is single-use and expires 5 minutes after the callback redirect.
   */
  async getAuthTokens(
    params: HandleFlowParams,
    authServerUrl: string,
  ): Promise<AuthResponse> {
    if (!('codeVerifier' in params) || !params.codeVerifier) {
      throw new OAuthError(
        'TelegramLoginHandler: Missing code_verifier',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }

    const verifyUrl = `${TelegramAuthServerUrl || authServerUrl}${TelegramAuthServerVerifyPath}`;

    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code_verifier: params.codeVerifier,
      }),
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      throw new OAuthError(
        `Telegram verify failed with status ${verifyResponse.status}: ${errorText}`,
        OAuthErrorType.AuthServerError,
      );
    }

    const verifyData = (await verifyResponse.json()) as TelegramVerifyResponse;

    if (!verifyData.token) {
      throw new OAuthError(
        'Telegram verify response did not include a token',
        OAuthErrorType.LoginError,
      );
    }

    const verifyTokenPayload = JSON.parse(
      this.decodeIdToken(verifyData.token),
    ) as TelegramVerifyTokenPayload;

    const hydraFormData = new FormData();
    hydraFormData.append(
      'grant_type',
      'urn:ietf:params:oauth:grant-type:jwt-bearer',
    );
    hydraFormData.append('client_id', TelegramHydraClientId);
    hydraFormData.append('assertion', verifyData.token);

    const hydraResponse = await fetch(TelegramHydraTokenUrl, {
      method: 'POST',
      body: hydraFormData,
    });

    if (!hydraResponse.ok) {
      const errorText = await hydraResponse.text();
      throw new OAuthError(
        `Telegram hydra token exchange failed with status ${hydraResponse.status}: ${errorText}`,
        OAuthErrorType.AuthServerError,
      );
    }

    const hydraData =
      (await hydraResponse.json()) as TelegramHydraTokenResponse;

    if (!hydraData.access_token) {
      throw new OAuthError(
        'Telegram hydra token exchange did not include access_token',
        OAuthErrorType.LoginError,
      );
    }

    const mintResponse = await requestAuthTokens(
      {
        id_token: hydraData.access_token,
      },
      this.authServerPath,
      authServerUrl,
    );

    // Hydra access token doubles as the profile pairing token — used later by
    // SeedlessOnboardingController.pairProfileServiceWithSocialLogin() to POST
    // to profilePairingEndpoint as the bearer credential.
    mintResponse.profile_pairing_token = hydraData.access_token;

    mintResponse.account_name = verifyTokenPayload.idp_sub
      ? `Telegram ${verifyTokenPayload.idp_sub}`
      : 'Telegram account';

    return mintResponse;
  }

  getAuthTokenRequestData(params: HandleFlowParams): AuthRequestParams {
    if (!('code' in params)) {
      throw new OAuthError(
        'TelegramLoginHandler: Invalid params',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }

    const { code, clientId, codeVerifier, web3AuthNetwork, redirectUri } =
      params;
    return {
      client_id: clientId,
      code,
      login_provider: this.authConnection,
      network: web3AuthNetwork,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    };
  }
}
