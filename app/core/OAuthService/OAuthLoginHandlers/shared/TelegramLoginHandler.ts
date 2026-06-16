import { openAuthSessionAsync, openBrowserAsync } from 'expo-web-browser';
import { AppState, Linking, Platform } from 'react-native';
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
import { isRetryableError, retryWithDelay } from '../utils';
import { OAuthError, OAuthErrorType } from '../../error';
import { AuthRequest } from 'expo-auth-session';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

const TELEGRAM_AUTH_SERVER_INITIATE_PATH = '/api/v2/telegram/login/initiate';
const TELEGRAM_AUTH_SERVER_VERIFY_PATH = '/api/v2/telegram/login/verify';
const TELEGRAM_MINT_PATH = 'api/v1/oauth/mint';
const REDIRECT_LINKING_FALLBACK_TIMEOUT_MS = 1500;
const ANDROID_LOGIN_REDIRECT_TIMEOUT_MS = 120000;
const VERIFY_APP_ACTIVE_TIMEOUT_MS = 5000;
const VERIFY_AFTER_APP_ACTIVE_DELAY_MS = 500;
const VERIFY_NETWORK_RETRY_DELAY_MS = 500;
const TELEGRAM_DEBUG_PREFIX = '[TelegramLoginHandler]';

const telegramDebug = (message: string, details?: Record<string, unknown>) => {
  DevLogger.log(`${TELEGRAM_DEBUG_PREFIX} ${message}`, details ?? {});
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const summarizeUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
      searchParamKeys: Array.from(parsedUrl.searchParams.keys()).sort(),
      hasState: parsedUrl.searchParams.has('state'),
      hasCode: parsedUrl.searchParams.has('code'),
      hasCodeChallenge: parsedUrl.searchParams.has('code_challenge'),
    };
  } catch (error) {
    return {
      parseError: getErrorMessage(error),
      rawLength: url.length,
      startsWithMetamask: url.startsWith('metamask://'),
      startsWithLinkMetamask: url.startsWith('https://link.metamask.io/'),
    };
  }
};

const summarizeOptionalUrl = (url: string | undefined) =>
  url ? summarizeUrl(url) : { isUndefined: true };

const summarizeRedirectComparison = (
  url: string,
  expectedRedirectUri: string,
) => ({
  url: summarizeUrl(url),
  expectedRedirectUri: summarizeUrl(expectedRedirectUri),
  startsWithExpectedRedirectUri: url.startsWith(expectedRedirectUri),
});

const waitForRedirectUrl = (
  redirectUrlPromise: Promise<string>,
  timeoutMs: number,
) =>
  new Promise<string | undefined>((resolve) => {
    telegramDebug('waitForRedirectUrl: start', { timeoutMs });
    const timeout = setTimeout(() => resolve(undefined), timeoutMs);

    redirectUrlPromise.then(
      (url) => {
        telegramDebug('waitForRedirectUrl: resolved from redirect promise', {
          redirectUrl: summarizeUrl(url),
        });
        clearTimeout(timeout);
        resolve(url);
      },
      () => {
        telegramDebug('waitForRedirectUrl: redirect promise rejected');
        clearTimeout(timeout);
        resolve(undefined);
      },
    );
  });

const wait = (timeoutMs: number) =>
  new Promise<void>((resolve) => {
    telegramDebug('wait: start', { timeoutMs });
    setTimeout(() => {
      telegramDebug('wait: complete', { timeoutMs });
      resolve();
    }, timeoutMs);
  });

const isNetworkRequestError = (error: unknown) => {
  const isNetworkError =
    error instanceof Error && error.message.includes('Network request failed');

  telegramDebug('isNetworkRequestError: evaluated error', {
    isNetworkError,
    errorMessage: getErrorMessage(error),
  });

  return isNetworkError;
};

const redirectUrlHasExpectedState = (url: string, expectedState: string) => {
  try {
    const parsedUrl = new URL(url);
    const receivedState = parsedUrl.searchParams.get('state');
    const matchesExpectedState = receivedState === expectedState;

    telegramDebug('redirectUrlHasExpectedState: checked state', {
      redirectUrl: summarizeUrl(url),
      hasReceivedState: Boolean(receivedState),
      expectedStateLength: expectedState.length,
      receivedStateLength: receivedState?.length ?? 0,
      matchesExpectedState,
    });

    return matchesExpectedState;
  } catch (error) {
    telegramDebug('redirectUrlHasExpectedState: failed to parse url', {
      redirectUrlLength: url.length,
      expectedStateLength: expectedState.length,
      errorMessage: getErrorMessage(error),
    });
    return false;
  }
};

const isOAuthRedirectUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const isRedirectUrl =
      parsedUrl.pathname === '/oauth-redirect' ||
      parsedUrl.hostname === 'oauth-redirect';

    telegramDebug('isOAuthRedirectUrl: checked redirect shape', {
      redirectUrl: summarizeUrl(url),
      isRedirectUrl,
    });

    return isRedirectUrl;
  } catch (error) {
    telegramDebug('isOAuthRedirectUrl: failed to parse url', {
      redirectUrlLength: url.length,
      errorMessage: getErrorMessage(error),
    });
    return false;
  }
};

const isExpectedOAuthRedirectUrl = (url: string, expectedRedirectUri: string) =>
  (() => {
    const startsWithExpectedRedirectUri = url.startsWith(expectedRedirectUri);
    const matchesOAuthRedirectShape = isOAuthRedirectUrl(url);
    const startsWithLinkMetamask = url.startsWith('https://link.metamask.io/');
    const startsWithMetamaskScheme = url.startsWith('metamask://');
    const isExpectedRedirect =
      startsWithExpectedRedirectUri ||
      (matchesOAuthRedirectShape && startsWithLinkMetamask) ||
      (matchesOAuthRedirectShape && startsWithMetamaskScheme);

    telegramDebug('isExpectedOAuthRedirectUrl: evaluated redirect url', {
      ...summarizeRedirectComparison(url, expectedRedirectUri),
      matchesOAuthRedirectShape,
      startsWithLinkMetamask,
      startsWithMetamaskScheme,
      isExpectedRedirect,
    });

    return isExpectedRedirect;
  })();

const waitForAndroidRedirectOrResume = (
  expectedRedirectUri: string,
  expectedState: string,
  timeoutMs: number,
) =>
  new Promise<boolean>((resolve) => {
    telegramDebug('waitForAndroidRedirectOrResume: start', {
      expectedRedirectUri: summarizeUrl(expectedRedirectUri),
      expectedStateLength: expectedState.length,
      timeoutMs,
      initialAppState: AppState.currentState,
    });
    let sawBrowserAppState = AppState.currentState !== 'active';
    let didResolve = false;
    const subscriptionRef: {
      appState?: ReturnType<typeof AppState.addEventListener>;
      linking?: ReturnType<typeof Linking.addEventListener>;
    } = {};

    const finish = (didRedirectOrResume: boolean) => {
      if (didResolve) {
        telegramDebug('waitForAndroidRedirectOrResume: finish ignored', {
          didRedirectOrResume,
        });
        return;
      }

      didResolve = true;
      telegramDebug('waitForAndroidRedirectOrResume: finish', {
        didRedirectOrResume,
        sawBrowserAppState,
      });
      subscriptionRef.appState?.remove();
      subscriptionRef.linking?.remove();
      resolve(didRedirectOrResume);
    };

    const timeout = setTimeout(() => {
      telegramDebug('waitForAndroidRedirectOrResume: timeout fired', {
        timeoutMs,
      });
      finish(false);
    }, timeoutMs);

    subscriptionRef.linking = Linking.addEventListener('url', ({ url }) => {
      telegramDebug('waitForAndroidRedirectOrResume: Linking url event', {
        redirectUrl: summarizeUrl(url),
      });
      if (
        isExpectedOAuthRedirectUrl(url, expectedRedirectUri) &&
        redirectUrlHasExpectedState(url, expectedState)
      ) {
        telegramDebug(
          'waitForAndroidRedirectOrResume: matching redirect url received',
        );
        clearTimeout(timeout);
        finish(true);
      } else {
        telegramDebug(
          'waitForAndroidRedirectOrResume: ignored non-matching redirect url',
          summarizeRedirectComparison(url, expectedRedirectUri),
        );
      }
    });

    subscriptionRef.appState = AppState.addEventListener(
      'change',
      (nextState) => {
        telegramDebug('waitForAndroidRedirectOrResume: app state changed', {
          nextState,
          sawBrowserAppState,
        });
        if (nextState !== 'active') {
          sawBrowserAppState = true;
          telegramDebug(
            'waitForAndroidRedirectOrResume: browser/app background observed',
            { nextState },
          );
          return;
        }

        if (sawBrowserAppState) {
          telegramDebug(
            'waitForAndroidRedirectOrResume: app active after browser',
          );
          clearTimeout(timeout);
          finish(true);
        } else {
          telegramDebug(
            'waitForAndroidRedirectOrResume: app active ignored before browser',
          );
        }
      },
    );
  });

const waitForActiveAppState = async () => {
  telegramDebug('waitForActiveAppState: start', {
    currentState: AppState.currentState,
  });

  if (AppState.currentState === 'active') {
    telegramDebug('waitForActiveAppState: already active');
    return;
  }

  await new Promise<void>((resolve) => {
    let didResolve = false;
    const subscriptionRef: {
      current?: ReturnType<typeof AppState.addEventListener>;
    } = {};

    const finish = () => {
      if (didResolve) {
        telegramDebug('waitForActiveAppState: finish ignored');
        return;
      }

      didResolve = true;
      telegramDebug('waitForActiveAppState: finish', {
        currentState: AppState.currentState,
      });
      subscriptionRef.current?.remove();
      resolve();
    };

    const timeout = setTimeout(() => {
      telegramDebug('waitForActiveAppState: timeout fired', {
        timeoutMs: VERIFY_APP_ACTIVE_TIMEOUT_MS,
      });
      finish();
    }, VERIFY_APP_ACTIVE_TIMEOUT_MS);

    subscriptionRef.current = AppState.addEventListener(
      'change',
      (nextState) => {
        telegramDebug('waitForActiveAppState: app state changed', {
          nextState,
        });
        if (nextState === 'active') {
          clearTimeout(timeout);
          finish();
        }
      },
    );
  });
};

export interface TelegramLoginHandlerParams extends BaseHandlerOptions {
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
    super(params);
    this.clientId = params.clientId;
    this.redirectUri = params.appRedirectUri;
    this.#profileSyncEnv = params.profileSyncEnv;

    telegramDebug('constructor: initialized handler', {
      redirectUri: summarizeUrl(this.redirectUri),
      clientIdLength: this.clientId.length,
      profileSyncEnv: this.#profileSyncEnv,
      nonceLength: this.nonce.length,
    });
  }

  #getProfileSyncUrls() {
    const urls = getEnvUrls(this.#profileSyncEnv);

    telegramDebug('#getProfileSyncUrls: resolved profile sync urls', {
      profileSyncEnv: this.#profileSyncEnv,
      authApiUrl: urls.authApiUrl,
      oidcApiUrl: urls.oidcApiUrl,
    });

    return urls;
  }

  #getAuthenticationServerUrl() {
    const authenticationServerUrl = this.#getProfileSyncUrls().authApiUrl;

    telegramDebug('#getAuthenticationServerUrl: resolved url', {
      authenticationServerUrl,
    });

    return authenticationServerUrl;
  }

  #getHydraTokenUrl() {
    const hydraTokenUrl = `${this.#getProfileSyncUrls().oidcApiUrl}/oauth2/token`;

    telegramDebug('#getHydraTokenUrl: resolved url', {
      hydraTokenUrl,
    });

    return hydraTokenUrl;
  }

  #getHydraClientId() {
    const hydraClientId = getOidcClientId(
      this.#profileSyncEnv,
      ProfileSyncPlatform.MOBILE,
    );

    telegramDebug('#getHydraClientId: resolved client id', {
      profileSyncEnv: this.#profileSyncEnv,
      platform: ProfileSyncPlatform.MOBILE,
      hydraClientIdLength: hydraClientId.length,
    });

    return hydraClientId;
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
    telegramDebug('login: start', {
      platformOS: Platform.OS,
      redirectUri: summarizeUrl(this.redirectUri),
      nonceLength: this.nonce.length,
      appState: AppState.currentState,
    });

    const { codeVerifier, challenge } = this.generateCodeVerifierChallenge();
    telegramDebug('login: generated PKCE verifier and challenge', {
      codeVerifierLength: codeVerifier.length,
      challengeLength: challenge.length,
    });

    const initiateUrl = new URL(
      `${this.#getAuthenticationServerUrl()}${TELEGRAM_AUTH_SERVER_INITIATE_PATH}`,
    );
    telegramDebug('login: created initiate URL', {
      initiateUrl: summarizeUrl(initiateUrl.toString()),
    });

    initiateUrl.searchParams.set('state', this.nonce);
    telegramDebug('login: attached state to initiate URL', {
      stateLength: this.nonce.length,
      initiateUrl: summarizeUrl(initiateUrl.toString()),
    });

    initiateUrl.searchParams.set('app_redirect_uri', this.redirectUri);
    telegramDebug('login: attached app_redirect_uri to initiate URL', {
      appRedirectUri: summarizeUrl(this.redirectUri),
      initiateUrl: summarizeUrl(initiateUrl.toString()),
    });

    initiateUrl.searchParams.set('code_challenge', challenge);
    telegramDebug('login: attached code_challenge to initiate URL', {
      challengeLength: challenge.length,
      initiateUrl: summarizeUrl(initiateUrl.toString()),
    });

    const buildLoginResult = (): LoginHandlerCodeResult => {
      telegramDebug('login: building login result', {
        authConnection: this.authConnection,
        codeChallengeLength: challenge.length,
        clientIdLength: this.clientId.length,
        redirectUri: summarizeUrl(this.redirectUri),
        codeVerifierLength: codeVerifier.length,
      });

      return {
        authConnection: this.authConnection,
        code: challenge,
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        codeVerifier,
      };
    };

    if (Platform.OS === 'android') {
      telegramDebug('login: entering Android browser flow', {
        timeoutMs: ANDROID_LOGIN_REDIRECT_TIMEOUT_MS,
      });

      const redirectOrResumePromise = waitForAndroidRedirectOrResume(
        this.redirectUri,
        this.nonce,
        ANDROID_LOGIN_REDIRECT_TIMEOUT_MS,
      );
      telegramDebug('login: created Android redirect/resume watcher');

      telegramDebug('login: opening Android browser', {
        initiateUrl: summarizeUrl(initiateUrl.toString()),
        createTask: false,
      });
      await openBrowserAsync(initiateUrl.toString(), {
        createTask: false,
      });
      telegramDebug(
        'login: Android browser opened, waiting for redirect/resume',
      );

      const didRedirectOrResume = await redirectOrResumePromise;
      telegramDebug('login: Android redirect/resume watcher resolved', {
        didRedirectOrResume,
      });

      if (didRedirectOrResume) {
        // Telegram sometimes returns to the existing Android task without
        // delivering the universal-link intent to React Native.
        telegramDebug('login: Android flow succeeded');
        return buildLoginResult();
      }

      telegramDebug('login: Android flow failed without redirect/resume');
      throw new OAuthError(
        'TelegramLoginHandler: No OAuth redirect received',
        OAuthErrorType.TelegramLoginError,
      );
    }

    telegramDebug('login: entering AuthRequest prompt flow', {
      clientIdLength: this.clientId.length,
      redirectUri: summarizeUrl(this.redirectUri),
      stateLength: this.nonce.length,
    });
    const authRequest = new AuthRequest({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      state: this.nonce,
    });
    telegramDebug('login: created AuthRequest');

    telegramDebug('login: opening AuthRequest prompt', {
      initiateUrl: summarizeUrl(initiateUrl.toString()),
    });
    const result = await authRequest.promptAsync(
      {},
      { url: initiateUrl.toString() },
    );
    telegramDebug('login: AuthRequest prompt resolved', {
      resultType: result.type,
      hasError: 'error' in result ? Boolean(result.error) : false,
    });

    if (result.type === 'success') {
      telegramDebug('login: AuthRequest flow succeeded');
      return buildLoginResult();
    }

    if (result.type === 'error') {
      telegramDebug('login: AuthRequest flow returned error', {
        hasErrorMessage: Boolean(result.error?.message),
      });
      if (result.error) {
        throw new OAuthError(result.error.message, OAuthErrorType.LoginError);
      }
      telegramDebug('login: AuthRequest flow returned error without details');
      throw new OAuthError(
        'TelegramLoginHandler: Unknown error',
        OAuthErrorType.TelegramLoginError,
      );
    }
    if (result.type === 'cancel') {
      telegramDebug('login: AuthRequest flow cancelled by user');
      throw new OAuthError(
        'TelegramLoginHandler: User cancelled the login process',
        OAuthErrorType.UserCancelled,
      );
    }
    if (result.type === 'dismiss') {
      telegramDebug('login: AuthRequest flow dismissed by user');
      throw new OAuthError(
        'TelegramLoginHandler: User dismissed the login process',
        OAuthErrorType.UserDismissed,
      );
    }
    telegramDebug('login: AuthRequest flow returned unknown result type', {
      resultType: result.type,
    });
    throw new OAuthError(
      'TelegramLoginHandler: Unknown error',
      OAuthErrorType.TelegramLoginError,
    );
  }

  async loginWithAuthSession(authorizationUrl: string): Promise<string> {
    telegramDebug('loginWithAuthSession: start', {
      authorizationUrl: summarizeUrl(authorizationUrl),
      redirectUri: summarizeUrl(this.redirectUri),
    });

    let removeRedirectListener: (() => void) | undefined;
    const redirectUrlPromise = new Promise<string>((resolve) => {
      telegramDebug('loginWithAuthSession: installing Linking url listener');
      const subscription = Linking.addEventListener('url', ({ url }) => {
        telegramDebug('loginWithAuthSession: Linking url event', {
          redirectUrl: summarizeUrl(url),
        });
        const matchesRedirectUri = isExpectedOAuthRedirectUrl(
          url,
          this.redirectUri,
        );
        telegramDebug('loginWithAuthSession: checked Linking redirect url', {
          matchesRedirectUri,
          ...summarizeRedirectComparison(url, this.redirectUri),
        });

        if (matchesRedirectUri) {
          telegramDebug('loginWithAuthSession: resolving from Linking url');
          resolve(url);
        }
      });

      removeRedirectListener = () => {
        telegramDebug('loginWithAuthSession: removing Linking url listener');
        subscription.remove();
      };
    });

    try {
      telegramDebug('loginWithAuthSession: opening auth session', {
        authorizationUrl: summarizeUrl(authorizationUrl),
        redirectUri: summarizeUrl(this.redirectUri),
        createTask: false,
      });
      const result = await openAuthSessionAsync(
        authorizationUrl,
        this.redirectUri,
        {
          createTask: false,
        },
      );
      telegramDebug('loginWithAuthSession: auth session resolved', {
        resultType: result.type,
        successUrl:
          result.type === 'success' ? summarizeUrl(result.url) : undefined,
      });

      if (result.type === 'success') {
        telegramDebug('loginWithAuthSession: returning success result url');
        return result.url;
      }

      telegramDebug('loginWithAuthSession: waiting for Linking fallback url', {
        timeoutMs: REDIRECT_LINKING_FALLBACK_TIMEOUT_MS,
      });
      const linkingRedirectUrl = await waitForRedirectUrl(
        redirectUrlPromise,
        REDIRECT_LINKING_FALLBACK_TIMEOUT_MS,
      );

      if (linkingRedirectUrl) {
        telegramDebug('loginWithAuthSession: returning Linking fallback url', {
          redirectUrl: summarizeUrl(linkingRedirectUrl),
        });
        return linkingRedirectUrl;
      }

      telegramDebug('loginWithAuthSession: checking initial URL fallback');
      const initialUrl = await Linking.getInitialURL();
      telegramDebug('loginWithAuthSession: initial URL resolved', {
        hasInitialUrl: Boolean(initialUrl),
        initialUrl: initialUrl ? summarizeUrl(initialUrl) : undefined,
      });

      if (
        initialUrl &&
        isExpectedOAuthRedirectUrl(initialUrl, this.redirectUri)
      ) {
        telegramDebug('loginWithAuthSession: returning initial URL fallback');
        return initialUrl;
      }

      if (result.type === 'cancel') {
        telegramDebug('loginWithAuthSession: auth session cancelled by user');
        throw new OAuthError(
          'TelegramLoginHandler: User cancelled the login process',
          OAuthErrorType.UserCancelled,
        );
      }

      if (result.type === 'dismiss') {
        telegramDebug('loginWithAuthSession: auth session dismissed by user');
        throw new OAuthError(
          'TelegramLoginHandler: User dismissed the login process',
          OAuthErrorType.UserDismissed,
        );
      }

      telegramDebug('loginWithAuthSession: auth session unknown result', {
        resultType: result.type,
      });
      throw new OAuthError(
        'TelegramLoginHandler: Unknown error',
        OAuthErrorType.TelegramLoginError,
      );
    } finally {
      telegramDebug('loginWithAuthSession: cleanup start');
      removeRedirectListener?.();
      telegramDebug('loginWithAuthSession: cleanup complete');
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
    telegramDebug('getAuthTokens: start', {
      hasCodeVerifier: 'codeVerifier' in params && Boolean(params.codeVerifier),
      hasCode: 'code' in params && Boolean(params.code),
      authConnection: params.authConnection,
      clientIdLength: params.clientId.length,
      redirectUri: summarizeOptionalUrl(params.redirectUri),
      w3aTokenServiceUrl,
      appState: AppState.currentState,
    });

    if (!('codeVerifier' in params) || !params.codeVerifier) {
      telegramDebug('getAuthTokens: missing code_verifier');
      throw new OAuthError(
        'TelegramLoginHandler: Missing code_verifier',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }

    const codeVerifier = params.codeVerifier;

    telegramDebug('getAuthTokens: code_verifier present', {
      codeVerifierLength: codeVerifier.length,
    });

    const verifyUrl = `${this.#getAuthenticationServerUrl()}${TELEGRAM_AUTH_SERVER_VERIFY_PATH}`;
    telegramDebug('getAuthTokens: built verify URL', {
      verifyUrl,
    });

    telegramDebug('getAuthTokens: waiting for active app state');
    await waitForActiveAppState();
    telegramDebug('getAuthTokens: active app state wait complete', {
      appState: AppState.currentState,
    });

    telegramDebug('getAuthTokens: waiting before verify request', {
      delayMs: VERIFY_AFTER_APP_ACTIVE_DELAY_MS,
    });
    await wait(VERIFY_AFTER_APP_ACTIVE_DELAY_MS);
    telegramDebug('getAuthTokens: verify delay complete');

    const requestVerify = () => {
      telegramDebug('getAuthTokens: sending verify request', {
        verifyUrl,
        codeVerifierLength: codeVerifier.length,
      });

      return fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code_verifier: codeVerifier,
        }),
      });
    };

    let verifyResponse: Response;
    try {
      verifyResponse = await requestVerify();
      telegramDebug('getAuthTokens: verify request resolved', {
        status: verifyResponse.status,
        ok: verifyResponse.ok,
      });
    } catch (error) {
      telegramDebug('getAuthTokens: verify request threw', {
        errorMessage: getErrorMessage(error),
      });

      if (!isNetworkRequestError(error)) {
        telegramDebug('getAuthTokens: verify error is not retryable network');
        throw error;
      }

      telegramDebug('getAuthTokens: retrying verify after network error', {
        delayMs: VERIFY_NETWORK_RETRY_DELAY_MS,
      });
      await wait(VERIFY_NETWORK_RETRY_DELAY_MS);
      verifyResponse = await requestVerify();
      telegramDebug('getAuthTokens: retry verify request resolved', {
        status: verifyResponse.status,
        ok: verifyResponse.ok,
      });
    }

    if (!verifyResponse.ok) {
      telegramDebug('getAuthTokens: verify response not ok', {
        status: verifyResponse.status,
      });
      const errorText = await verifyResponse.text();
      telegramDebug('getAuthTokens: verify error body read', {
        status: verifyResponse.status,
        errorTextLength: errorText.length,
      });
      throw new OAuthError(
        `Telegram verify failed with status ${verifyResponse.status}: ${errorText}`,
        OAuthErrorType.AuthServerError,
      );
    }

    telegramDebug('getAuthTokens: parsing verify response json');
    const verifyData = (await verifyResponse.json()) as TelegramVerifyResponse;
    telegramDebug('getAuthTokens: parsed verify response json', {
      hasToken: Boolean(verifyData.token),
      tokenLength: verifyData.token?.length ?? 0,
      expiresIn: verifyData.expires_in,
      identifierType: verifyData.profile?.identifier_type,
      hasProfileId: Boolean(verifyData.profile?.profile_id),
      hasIdentifierId: Boolean(verifyData.profile?.identifier_id),
    });

    if (!verifyData.token) {
      telegramDebug('getAuthTokens: verify response missing token');
      throw new OAuthError(
        'Telegram verify response did not include a token',
        OAuthErrorType.LoginError,
      );
    }

    telegramDebug('getAuthTokens: decoding verify token payload', {
      tokenLength: verifyData.token.length,
    });
    const verifyTokenPayload = JSON.parse(
      this.decodeIdToken(verifyData.token),
    ) as TelegramVerifyTokenPayload;
    telegramDebug('getAuthTokens: decoded verify token payload', {
      hasIdpSub: Boolean(verifyTokenPayload.idp_sub),
      hasSub: Boolean(verifyTokenPayload.sub),
    });

    const hydraFormBody = new URLSearchParams();
    telegramDebug('getAuthTokens: creating Hydra form body');

    hydraFormBody.append(
      'grant_type',
      'urn:ietf:params:oauth:grant-type:jwt-bearer',
    );
    telegramDebug('getAuthTokens: appended Hydra grant_type');

    hydraFormBody.append('client_id', this.#getHydraClientId());
    telegramDebug('getAuthTokens: appended Hydra client_id');

    hydraFormBody.append('assertion', verifyData.token);
    telegramDebug('getAuthTokens: appended Hydra assertion', {
      assertionLength: verifyData.token.length,
    });

    const hydraTokenUrl = this.#getHydraTokenUrl();
    telegramDebug('getAuthTokens: sending Hydra token request', {
      hydraTokenUrl,
      formKeys: Array.from(hydraFormBody.keys()).sort(),
    });

    const hydraResponse = await fetch(hydraTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: hydraFormBody.toString(),
    });
    telegramDebug('getAuthTokens: Hydra token request resolved', {
      status: hydraResponse.status,
      ok: hydraResponse.ok,
    });

    if (!hydraResponse.ok) {
      telegramDebug('getAuthTokens: Hydra response not ok', {
        status: hydraResponse.status,
      });
      const errorText = await hydraResponse.text();
      telegramDebug('getAuthTokens: Hydra error body read', {
        status: hydraResponse.status,
        errorTextLength: errorText.length,
      });
      throw new OAuthError(
        `Telegram hydra token exchange failed with status ${hydraResponse.status}: ${errorText}`,
        OAuthErrorType.AuthServerError,
      );
    }

    telegramDebug('getAuthTokens: parsing Hydra response json');
    const hydraData =
      (await hydraResponse.json()) as TelegramHydraTokenResponse;
    telegramDebug('getAuthTokens: parsed Hydra response json', {
      hasAccessToken: Boolean(hydraData.access_token),
      accessTokenLength: hydraData.access_token?.length ?? 0,
      expiresIn: hydraData.expires_in,
      scope: hydraData.scope,
      tokenType: hydraData.token_type,
    });

    if (!hydraData.access_token) {
      telegramDebug('getAuthTokens: Hydra response missing access_token');
      throw new OAuthError(
        'Telegram hydra token exchange did not include access_token',
        OAuthErrorType.LoginError,
      );
    }

    telegramDebug(
      'getAuthTokens: minting auth tokens with Hydra access token',
      {
        authServerPath: this.authServerPath,
        w3aTokenServiceUrl,
        accessTokenLength: hydraData.access_token.length,
      },
    );
    const mintResponse = await retryWithDelay(
      () => {
        telegramDebug('getAuthTokens: sending mint request');

        return requestAuthTokens(
          {
            id_token: hydraData.access_token,
          },
          this.authServerPath,
          w3aTokenServiceUrl,
        );
      },
      {
        maxRetries: 3,
        baseDelayMs: 500,
        maxDelayMs: 5000,
        jitterFactor: 0.25,
        shouldRetry: isRetryableError,
        onRetry: ({ attempt, willRetry, delayMs, error }) => {
          telegramDebug('getAuthTokens: mint request retry callback', {
            attempt,
            willRetry,
            delayMs,
            errorMessage: getErrorMessage(error),
          });
        },
      },
    );
    telegramDebug('getAuthTokens: mint response received', {
      hasIdToken: Boolean(mintResponse.id_token),
      hasAccessToken: Boolean(mintResponse.access_token),
      hasMetadataAccessToken: Boolean(mintResponse.metadata_access_token),
      indexCount: mintResponse.indexes?.length ?? 0,
      endpointCount: mintResponse.endpoints
        ? Object.keys(mintResponse.endpoints).length
        : 0,
    });

    mintResponse.account_name = verifyTokenPayload.idp_sub
      ? `Telegram ${verifyTokenPayload.idp_sub}`
      : 'Telegram account';
    telegramDebug('getAuthTokens: attached account name', {
      usedIdpSub: Boolean(verifyTokenPayload.idp_sub),
      accountNameLength: mintResponse.account_name.length,
    });

    telegramDebug('getAuthTokens: complete');
    return mintResponse;
  }

  getUserInfo(authResponse: AuthResponse): OAuthLoginUserInfo {
    telegramDebug('getUserInfo: start', {
      hasAccountName: Boolean(authResponse.account_name),
      hasIdToken: Boolean(authResponse.id_token),
    });

    const userInfo = super.getUserInfo(authResponse);
    telegramDebug('getUserInfo: base user info resolved', {
      hasUserId: Boolean(userInfo.userId),
      hasAccountName: Boolean(userInfo.accountName),
    });

    const telegramUserInfo = {
      userId: userInfo.userId,
      accountName:
        authResponse.account_name ??
        (userInfo.userId ? `Telegram ${userInfo.userId}` : 'Telegram account'),
    };

    telegramDebug('getUserInfo: complete', {
      hasUserId: Boolean(telegramUserInfo.userId),
      accountNameLength: telegramUserInfo.accountName.length,
      usedAuthResponseAccountName: Boolean(authResponse.account_name),
    });

    return telegramUserInfo;
  }

  getAuthTokenRequestData(params: HandleFlowParams): AuthRequestParams {
    telegramDebug('getAuthTokenRequestData: start', {
      hasCode: 'code' in params && Boolean(params.code),
      authConnection: params.authConnection,
      clientIdLength: params.clientId.length,
      redirectUri: summarizeOptionalUrl(params.redirectUri),
    });

    if (!('code' in params)) {
      telegramDebug('getAuthTokenRequestData: missing code');
      throw new OAuthError(
        'TelegramLoginHandler: Invalid params',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }

    const { code, clientId, codeVerifier, web3AuthNetwork, redirectUri } =
      params;
    telegramDebug('getAuthTokenRequestData: destructured params', {
      codeLength: code.length,
      clientIdLength: clientId.length,
      hasCodeVerifier: Boolean(codeVerifier),
      codeVerifierLength: codeVerifier?.length ?? 0,
      web3AuthNetwork,
      redirectUri: summarizeOptionalUrl(redirectUri),
    });

    const requestData = {
      client_id: clientId,
      code,
      login_provider: this.authConnection,
      network: web3AuthNetwork,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    };

    telegramDebug('getAuthTokenRequestData: complete', {
      requestKeys: Object.keys(requestData).sort(),
      loginProvider: requestData.login_provider,
      network: requestData.network,
      redirectUri: summarizeOptionalUrl(requestData.redirect_uri),
      codeLength: requestData.code.length,
      codeVerifierLength: requestData.code_verifier?.length ?? 0,
    });

    return requestData;
  }
}
