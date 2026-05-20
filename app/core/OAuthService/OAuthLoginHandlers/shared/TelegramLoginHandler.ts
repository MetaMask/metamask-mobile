import { openAuthSessionAsync } from 'expo-web-browser';
import { AppState, Linking } from 'react-native';
import {
  Env as ProfileSyncEnv,
  getEnvUrls,
  getOidcClientId,
  Platform as ProfileSyncPlatform,
} from '@metamask/profile-sync-controller/sdk';
import {
  AuthConnection,
  AuthRequestParams,
  AuthResponse,
  HandleFlowParams,
  LoginHandlerCodeResult,
  OAuthLoginUserInfo,
} from '../../OAuthInterface';
import {
  BaseHandlerOptions,
  BaseLoginHandler,
  getAuthTokens as requestAuthTokens,
} from '../baseHandler';
import { OAuthError, OAuthErrorType } from '../../error';

const TELEGRAM_AUTH_SERVER_INITIATE_PATH = '/api/v2/telegram/login/initiate';
const TELEGRAM_AUTH_SERVER_VERIFY_PATH = '/api/v2/telegram/login/verify';
const TELEGRAM_MINT_PATH = 'api/v1/oauth/mint';
const REDIRECT_LINKING_FALLBACK_TIMEOUT_MS = 1500;
const VERIFY_APP_ACTIVE_TIMEOUT_MS = 5000;
const VERIFY_AFTER_APP_ACTIVE_DELAY_MS = 500;
const VERIFY_NETWORK_RETRY_DELAY_MS = 500;

const waitForRedirectUrl = (
  redirectUrlPromise: Promise<string>,
  timeoutMs: number,
) =>
  new Promise<string | undefined>((resolve) => {
    const timeout = setTimeout(() => resolve(undefined), timeoutMs);

    redirectUrlPromise.then(
      (url) => {
        clearTimeout(timeout);
        resolve(url);
      },
      () => {
        clearTimeout(timeout);
        resolve(undefined);
      },
    );
  });

const wait = (timeoutMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));

const isNetworkRequestError = (error: unknown) =>
  error instanceof Error && error.message.includes('Network request failed');

const waitForActiveAppState = async () => {
  if (AppState.currentState === 'active') {
    return;
  }

  await new Promise<void>((resolve) => {
    let didResolve = false;
    const subscriptionRef: {
      current?: ReturnType<typeof AppState.addEventListener>;
    } = {};

    const finish = () => {
      if (didResolve) {
        return;
      }

      didResolve = true;
      subscriptionRef.current?.remove();
      resolve();
    };

    const timeout = setTimeout(() => finish(), VERIFY_APP_ACTIVE_TIMEOUT_MS);

    subscriptionRef.current = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') {
          clearTimeout(timeout);
          finish();
        }
      },
    );
  });
};

export interface TelegramLoginHandlerParams
  extends Omit<BaseHandlerOptions, 'clientId'> {
  appRedirectUri: string;
  profileSyncEnv: ProfileSyncEnv;
}

interface TelegramVerifyResponse {
  expires_in: number;
  profile: {
    created_at: string;
    identifier_id: string;
    identifier_type: string;
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
  protected clientId: string;
  protected redirectUri: string;
  readonly #profileSyncEnv: ProfileSyncEnv;

  get authConnection() {
    return AuthConnection.Telegram;
  }

  get scope() {
    return this.#scope;
  }

  get authServerPath() {
    return TELEGRAM_MINT_PATH;
  }

  constructor(params: TelegramLoginHandlerParams) {
    super({ ...params, clientId: AuthConnection.Telegram });
    this.clientId = AuthConnection.Telegram;
    this.redirectUri = params.appRedirectUri;
    this.#profileSyncEnv = params.profileSyncEnv;
  }

  #getProfileSyncUrls() {
    return getEnvUrls(this.#profileSyncEnv);
  }

  #getAuthenticationServerUrl() {
    return this.#getProfileSyncUrls().authApiUrl;
  }

  #getHydraTokenUrl() {
    return `${this.#getProfileSyncUrls().oidcApiUrl}/oauth2/token`;
  }

  #getHydraClientId() {
    return getOidcClientId(this.#profileSyncEnv, ProfileSyncPlatform.MOBILE);
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
      `${this.#getAuthenticationServerUrl()}${TELEGRAM_AUTH_SERVER_INITIATE_PATH}`,
    );

    initiateUrl.searchParams.set('state', this.nonce);
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
    let removeRedirectListener: (() => void) | undefined;
    const redirectUrlPromise = new Promise<string>((resolve) => {
      const subscription = Linking.addEventListener('url', ({ url }) => {
        const matchesRedirectUri = url.startsWith(this.redirectUri);

        if (matchesRedirectUri) {
          resolve(url);
        }
      });

      removeRedirectListener = () => subscription.remove();
    });

    try {
      const result = await openAuthSessionAsync(
        authorizationUrl,
        this.redirectUri,
        {
          createTask: false,
        },
      );

      if (result.type === 'success') {
        return result.url;
      }

      const linkingRedirectUrl = await waitForRedirectUrl(
        redirectUrlPromise,
        REDIRECT_LINKING_FALLBACK_TIMEOUT_MS,
      );

      if (linkingRedirectUrl) {
        return linkingRedirectUrl;
      }

      const initialUrl = await Linking.getInitialURL();

      if (initialUrl?.startsWith(this.redirectUri)) {
        return initialUrl;
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
    } finally {
      removeRedirectListener?.();
    }
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
    w3aTokenServiceUrl: string,
  ): Promise<AuthResponse> {
    if (!('codeVerifier' in params) || !params.codeVerifier) {
      throw new OAuthError(
        'TelegramLoginHandler: Missing code_verifier',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }

    const verifyUrl = `${this.#getAuthenticationServerUrl()}${TELEGRAM_AUTH_SERVER_VERIFY_PATH}`;

    await waitForActiveAppState();
    await wait(VERIFY_AFTER_APP_ACTIVE_DELAY_MS);

    const requestVerify = () =>
      fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code_verifier: params.codeVerifier,
        }),
      });

    let verifyResponse: Response;
    try {
      verifyResponse = await requestVerify();
    } catch (error) {
      if (!isNetworkRequestError(error)) {
        throw error;
      }

      await wait(VERIFY_NETWORK_RETRY_DELAY_MS);
      verifyResponse = await requestVerify();
    }

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

    const hydraFormBody = new URLSearchParams();
    hydraFormBody.append(
      'grant_type',
      'urn:ietf:params:oauth:grant-type:jwt-bearer',
    );
    hydraFormBody.append('client_id', this.#getHydraClientId());
    hydraFormBody.append('assertion', verifyData.token);

    const hydraTokenUrl = this.#getHydraTokenUrl();

    const hydraResponse = await fetch(hydraTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: hydraFormBody.toString(),
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
        client_id: params.clientId,
        login_provider: this.authConnection,
        network: params.web3AuthNetwork,
        redirect_uri: params.redirectUri,
        code_verifier: params.codeVerifier,
      },
      this.authServerPath,
      w3aTokenServiceUrl,
    );

    mintResponse.account_name = verifyTokenPayload.idp_sub
      ? `Telegram ${verifyTokenPayload.idp_sub}`
      : 'Telegram account';

    return mintResponse;
  }

  getUserInfo(authResponse: AuthResponse): OAuthLoginUserInfo {
    const userInfo = super.getUserInfo(authResponse);

    return {
      userId: userInfo.userId,
      accountName:
        authResponse.account_name ??
        (userInfo.userId ? `Telegram ${userInfo.userId}` : 'Telegram account'),
    };
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
