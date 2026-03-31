import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import {
  AuthConnection,
  AuthRequestParams,
  HandleFlowParams,
  LoginHandlerCodeResult,
} from '../../OAuthInterface';
import { BaseHandlerOptions, BaseLoginHandler } from '../baseHandler';
import { OAuthError, OAuthErrorType } from '../../error';
import { TelegramAuthServerInitiatePath, TelegramAuthServerUrl } from '../constants';

interface TelegramInitiateResponse {
  authorization_url: string;
  state: string;
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
    return 'api/v1/oauth/token';
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

    console.log(
      '[TelegramLogin] opening auth session:',
      JSON.stringify(
        {
          authorizationUrl,
          redirectUri: this.redirectUri,
          expectedState,
        },
        null,
        2,
      ),
    );

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[TelegramLogin] raw incoming app url:', url);
    });

    const initialUrl = await Linking.getInitialURL();
    console.log('[TelegramLogin] current initial url before auth:', initialUrl);

    const result = await WebBrowser.openAuthSessionAsync(
      authorizationUrl,
      this.redirectUri,
    );

    linkingSubscription.remove();

    console.log(
      '[TelegramLogin] raw auth session result:',
      JSON.stringify(result, null, 2),
    );
    console.log('[TelegramLogin] raw auth session result type:', result.type);

    if (result.type === 'success') {
      const callbackUrl = result.url;
      console.log(
        '[TelegramLogin] expected redirect uri:',
        this.redirectUri,
      );
      const callbackParams = Object.fromEntries(
        new URL(callbackUrl).searchParams.entries(),
      );

      console.log('[TelegramLogin] auth session callback url:', callbackUrl);
      console.log(
        '[TelegramLogin] auth session callback params:',
        JSON.stringify(callbackParams, null, 2),
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
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        codeVerifier,
      };
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
