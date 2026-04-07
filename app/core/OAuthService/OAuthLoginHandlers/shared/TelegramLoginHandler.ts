import { AuthRequest, ResponseType } from 'expo-auth-session';
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
} from '../constants';
import Logger from '../../../../util/Logger';

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

    const authRequest = new AuthRequest({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      scopes: this.#scope,
      responseType: ResponseType.Code,
      usePKCE: false,
      state: this.nonce,
      extraParams: {
        code_challenge: challenge,
        app_redirect_uri: this.redirectUri,
      },
    });

    const result = await authRequest.promptAsync({
      authorizationEndpoint: `${TelegramAuthServerUrl || this.options.authServerUrl}${TelegramAuthServerInitiatePath}`,
    });

    Logger.log('TelegramLoginHandler: result', result);

    if (result.type === 'success') {
      Logger.log('TelegramLoginHandler: success');
      return {
        authConnection: this.authConnection,
        code: challenge,
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        codeVerifier,
      };
    }

    if (result.type === 'cancel') {
      Logger.log('TelegramLoginHandler: cancel');
      throw new OAuthError(
        'TelegramLoginHandler: User cancelled the login process',
        OAuthErrorType.UserCancelled,
      );
    }

    if (result.type === 'dismiss') {
      Logger.log('TelegramLoginHandler: dismiss');
      throw new OAuthError(
        'TelegramLoginHandler: User dismissed the login process',
        OAuthErrorType.UserDismissed,
      );
    }

    Logger.log('TelegramLoginHandler: unknown error');
    throw new OAuthError(
      'TelegramLoginHandler: Unknown error',
      OAuthErrorType.TelegramLoginError,
    );
  }

  /**
   * Exchanges the PKCE code_verifier for the Telegram OIDC token via the verify endpoint,
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
      Logger.log('TelegramLoginHandler: Missing code_verifier');
      Logger.log('TelegramLoginHandler: params', params);
      throw new OAuthError(
        'TelegramLoginHandler: Missing code_verifier',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }

    const verifyUrl = `${TelegramAuthServerUrl || authServerUrl}${TelegramAuthServerVerifyPath}`;

    Logger.log('[TelegramLogin] verify request:', verifyUrl);

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
      Logger.log('[TelegramLogin] verify error:', errorText);
      throw new OAuthError(
        `Telegram verify failed with status ${verifyResponse.status}: ${errorText}`,
        OAuthErrorType.AuthServerError,
      );
    }

    const verifyData = (await verifyResponse.json()) as TelegramVerifyResponse;
    Logger.log('TelegramLoginHandler: authResponse', verifyData);
    Logger.log('[TelegramLogin] verify success');

    if (!verifyData.token) {
      throw new OAuthError(
        'Telegram verify response did not include a token',
        OAuthErrorType.LoginError,
      );
    }

    const mintResponse = await requestAuthTokens(
      {
        id_token: verifyData.token,
      },
      this.authServerPath,
      authServerUrl,
    );

    Logger.log('[TelegramLogin] mint success');
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
