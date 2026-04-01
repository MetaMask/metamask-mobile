// TODO: Replace this temporary dependency once Telegram auth flow is finalized.
// eslint-disable-next-line import-x/no-extraneous-dependencies
import { openAuthSessionAsync } from 'expo-web-browser';
import { Alert, Linking } from 'react-native';
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
  getAuthTokens,
} from '../baseHandler';
import { OAuthError, OAuthErrorType } from '../../error';
import {
  TelegramAuthServerInitiatePath,
  TelegramAuthServerUrl,
  TelegramAuthServerVerifyPath,
  TelegramMintPath,
} from '../constants';
import Logger from '../../../../util/Logger';

interface TelegramInitiateResponse {
  authorization_url: string;
  state: string;
}

interface TelegramVerifyResponse {
  token: string;
  expires_in: number;
  profile: {
    id: string;
    identifier_id: string;
    identifier_type: string;
  };
}

export interface TelegramLoginHandlerParams extends BaseHandlerOptions {
  appRedirectUri: string;
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
    return 'api/v1/oauth/mint';
  }

  constructor(params: TelegramLoginHandlerParams) {
    super(params);
    this.redirectUri = params.appRedirectUri;
  }

  async login(): Promise<LoginHandlerCodeResult> {
    const { codeVerifier, challenge } = this.generateCodeVerifierChallenge();
    const authServerUrl = TelegramAuthServerUrl || this.options.authServerUrl;

    const initiateResponse = await fetch(
      `${authServerUrl}${TelegramAuthServerInitiatePath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code_challenge: challenge,
          app_redirect_uri: this.redirectUri,
        }),
      },
    );

    if (!initiateResponse.ok) {
      throw new OAuthError(
        `Telegram initiate failed with status ${initiateResponse.status}: ${await initiateResponse.text()}`,
        OAuthErrorType.TelegramLoginError,
      );
    }

    const initiateData =
      (await initiateResponse.json()) satisfies TelegramInitiateResponse;

    const authorizationUrl = initiateData.authorization_url;
    const expectedState = initiateData.state;

    if (!authorizationUrl || !expectedState) {
      throw new OAuthError(
        'Telegram initiate response is missing authorization_url or state',
        OAuthErrorType.TelegramLoginError,
      );
    }

    const parsedAuthorizationUrl = new URL(authorizationUrl);
    this.clientId =
      parsedAuthorizationUrl.searchParams.get('client_id') || this.clientId;

    Logger.log(
      '[TelegramLogin] opening auth session:',
      JSON.stringify({
        authorizationUrl,
        redirectUri: this.redirectUri,
        expectedState,
      }),
    );

    const initialUrl = await Linking.getInitialURL();
    Logger.log('[TelegramLogin] current initial url before auth:', initialUrl);
    const callbackUrl = await this.loginWithAuthSession(authorizationUrl);

    Logger.log('[TelegramLogin] expected redirect uri:', this.redirectUri);
    const callbackParams = Object.fromEntries(
      new URL(callbackUrl).searchParams.entries(),
    );

    Logger.log('[TelegramLogin] auth session callback url:', callbackUrl);
    Logger.log(
      '[TelegramLogin] auth session callback params:',
      JSON.stringify(callbackParams),
    );
    Alert.alert(
      'Telegram Callback',
      `URL:\n${callbackUrl}\n\nParams:\n${JSON.stringify(
        callbackParams,
        null,
        2,
      )}`,
    );

    const returnedState = callbackParams.state;
    if (returnedState !== expectedState) {
      throw new OAuthError(
        `Telegram OAuth state mismatch. Expected ${expectedState}, received ${returnedState}`,
        OAuthErrorType.InvalidOauthStateError,
      );
    }

    const code = callbackParams.code;
    if (!code) {
      throw new OAuthError(
        'Telegram callback did not include an authorization code. Check the console log payload from the callback.',
        OAuthErrorType.TelegramLoginError,
      );
    }

    return {
      authConnection: this.authConnection,
      code,
      state: returnedState,
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      codeVerifier,
    };
  }

  async loginWithAuthSession(authorizationUrl: string): Promise<string> {
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      Logger.log('[TelegramLogin] raw incoming app url:', url);
    });

    const result = await openAuthSessionAsync(
      authorizationUrl,
      this.redirectUri,
      {
        createTask: true,
        showInRecents: true,
        useProxyActivity: true,
      },
    );

    linkingSubscription.remove();

    Logger.log(
      '[TelegramLogin] raw auth session result:',
      JSON.stringify(result),
    );
    Logger.log('[TelegramLogin] raw auth session result type:', result.type);

    if (result.type === 'success') {
      return result.url;
    }

    if (result.type === 'cancel') {
      throw new OAuthError(
        'Telegram login: User cancelled the login process',
        OAuthErrorType.UserCancelled,
      );
    }

    if (result.type === 'dismiss') {
      throw new OAuthError(
        'Telegram login: User dismissed the login process',
        OAuthErrorType.UserDismissed,
      );
    }

    throw new OAuthError(
      `Telegram login returned unsupported result type: ${result.type}`,
      OAuthErrorType.TelegramLoginError,
    );
  }

  async getAuthTokens(
    params: HandleFlowParams,
    authServerUrl: string,
  ): Promise<AuthResponse> {
    if (!('code' in params) || !params.state || !params.codeVerifier) {
      throw new OAuthError(
        'Telegram login: Invalid params',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }

    const telegramAuthServerUrl =
      TelegramAuthServerUrl || this.options.authServerUrl;
    const verifyUrl = `${telegramAuthServerUrl}${TelegramAuthServerVerifyPath}`;
    const verifyRequestBody = {
      code: params.code,
      state: params.state,
      code_verifier: params.codeVerifier,
    };

    Logger.log(
      '[TelegramLogin] verify request:',
      JSON.stringify({
        url: verifyUrl,
        body: verifyRequestBody,
      }),
    );

    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyRequestBody),
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      Logger.log(
        '[TelegramLogin] verify error:',
        JSON.stringify({
          url: verifyUrl,
          status: verifyResponse.status,
          body: verifyRequestBody,
          response: errorText,
        }),
      );
      throw new OAuthError(
        `Telegram verify failed with status ${verifyResponse.status}: ${errorText}`,
        OAuthErrorType.AuthServerError,
      );
    }

    const verifyData =
      (await verifyResponse.json()) satisfies TelegramVerifyResponse;

    Logger.log(
      '[TelegramLogin] verify success:',
      JSON.stringify({
        url: verifyUrl,
        status: verifyResponse.status,
      }),
    );

    if (!verifyData.token) {
      throw new OAuthError(
        'Telegram verify response did not include a token',
        OAuthErrorType.TelegramLoginError,
      );
    }

    Logger.log(
      '[TelegramLogin] mint request:',
      JSON.stringify({
        url: `${authServerUrl}/${TelegramMintPath}`,
      }),
    );

    try {
      const mintResponse = await getAuthTokens(
        {
          id_token: verifyData.token,
        },
        TelegramMintPath,
        authServerUrl,
      );

      Logger.log(
        '[TelegramLogin] mint success:',
        JSON.stringify({
          url: `${authServerUrl}/${TelegramMintPath}`,
        }),
      );

      return mintResponse;
    } catch (error) {
      Logger.log(
        '[TelegramLogin] mint error:',
        JSON.stringify({
          url: `${authServerUrl}/${TelegramMintPath}`,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw error;
    }
  }

  getAuthTokenRequestData(params: HandleFlowParams): AuthRequestParams {
    if (!('code' in params)) {
      throw new OAuthError(
        'Telegram login: Invalid params',
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
