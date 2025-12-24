import Engine from '../Engine';
import Logger from '../../util/Logger';
import { trace, endTrace, TraceName, TraceOperation } from '../../util/trace';

import {
  HandleOAuthLoginResult,
  AuthConnection,
  AuthResponse,
  OAuthUserInfo,
  OAuthLoginResultType,
  LoginHandlerResult,
} from './OAuthInterface';
import {
  Web3AuthNetwork,
  AuthConnection as SeedlessAuthConnection,
} from '@metamask/seedless-onboarding-controller';
import {
  AuthConnectionConfig,
  AuthServerUrl,
  web3AuthNetwork as currentWeb3AuthNetwork,
  SupportedPlatforms,
  AUTH_SERVER_MARKETING_OPT_IN_PATH,
} from './OAuthLoginHandlers/constants';
import { OAuthError, OAuthErrorType } from './error';
import { BaseLoginHandler } from './OAuthLoginHandlers/baseHandler';
import { Platform } from 'react-native';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../Engine/controllers/seedless-onboarding-controller/error';
import { MetaMetrics } from '../Analytics';
import { MetricsEventBuilder } from '../Analytics/MetricsEventBuilder';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';

export interface MarketingOptInRequest {
  opt_in_status: boolean;
}

export interface MarketingOptInResponse {
  is_opt_in: boolean;
}

export interface OAuthServiceConfig {
  authConnectionConfig: {
    [key in SupportedPlatforms]: {
      [key1 in AuthConnection]: {
        authConnectionId: string;
        groupedAuthConnectionId?: string;
      };
    };
  };
  web3AuthNetwork: Web3AuthNetwork;
  authServerUrl: string;
}

interface OAuthServiceLocalState {
  userId?: string;
  accountName?: string;
  loginInProgress: boolean;
  oauthLoginSuccess: boolean;
  oauthLoginError: string | null;
  userClickedRehydration?: boolean;
}
export class OAuthService {
  public localState: OAuthServiceLocalState;

  public config: OAuthServiceConfig;

  constructor(config: OAuthServiceConfig) {
    const { authServerUrl, web3AuthNetwork, authConnectionConfig } = config;
    this.localState = {
      loginInProgress: false,
      userId: undefined,
      accountName: undefined,
      oauthLoginSuccess: false,
      oauthLoginError: null,
    };
    this.config = {
      authConnectionConfig,
      web3AuthNetwork,
      authServerUrl,
    };
  }

  #dispatchLogin = () => {
    this.resetOauthState();

    this.updateLocalState({
      loginInProgress: true,
    });
  };

  #dispatchPostLogin = (result: HandleOAuthLoginResult) => {
    const stateToUpdate: Partial<OAuthService['localState']> = {
      loginInProgress: false,
    };
    if (result.type === OAuthLoginResultType.SUCCESS) {
      stateToUpdate.oauthLoginSuccess = true;
      stateToUpdate.oauthLoginError = null;
    } else {
      stateToUpdate.oauthLoginSuccess = false;
      stateToUpdate.oauthLoginError = result.error;
    }
    this.updateLocalState(stateToUpdate);

    // move dispatch loading false to onboarding view
  };

  handleSeedlessAuthenticate = async (
    data: AuthResponse,
    authConnection: SeedlessAuthConnection,
  ): Promise<HandleOAuthLoginResult> => {
    try {
      const { userId, accountName } = this.localState;

      if (!userId) {
        throw new Error('No user id found');
      }

      const authConnectionConfig =
        this.config.authConnectionConfig[Platform.OS as SupportedPlatforms]?.[
          authConnection
        ];

      const refreshToken = data.refresh_token;
      const revokeToken = data.revoke_token;

      if (!refreshToken) {
        throw new SeedlessOnboardingControllerError(
          SeedlessOnboardingControllerErrorType.AuthenticationError,
          'No refresh token found',
        );
      }

      if (!revokeToken) {
        throw new SeedlessOnboardingControllerError(
          SeedlessOnboardingControllerErrorType.AuthenticationError,
          'No revoke token found',
        );
      }

      const result =
        await Engine.context.SeedlessOnboardingController.authenticate({
          idTokens: [data.id_token],
          authConnection,
          authConnectionId: authConnectionConfig.authConnectionId,
          groupedAuthConnectionId: authConnectionConfig.groupedAuthConnectionId,
          userId,
          socialLoginEmail: accountName,
          refreshToken,
          revokeToken,
          accessToken: data.access_token,
          metadataAccessToken: data.metadata_access_token,
        });
      Logger.log(
        'handleCodeFlow: success seedless authenticate. isNewUser',
        result.isNewUser,
      );
      return {
        type: OAuthLoginResultType.SUCCESS,
        existingUser: !result.isNewUser,
        accountName,
      };
    } catch (error) {
      Logger.log(error as Error, {
        message: 'handleCodeFlow',
      });
      throw error;
    }
  };

  #trackSocialLoginFailure = ({
    authConnection,
    errorCategory,
    error,
  }: {
    authConnection: AuthConnection;
    errorCategory: 'provider_login' | 'get_auth_tokens' | 'seedless_auth';
    error: unknown;
  }) => {
    const isUserCancelled =
      error instanceof OAuthError &&
      (error.code === OAuthErrorType.UserCancelled ||
        error.code === OAuthErrorType.UserDismissed);

    let userClickedRehydration: 'true' | 'false' | 'unknown' = 'unknown';
    if (this.localState.userClickedRehydration !== undefined) {
      userClickedRehydration = this.localState.userClickedRehydration
        ? 'true'
        : 'false';
    }

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.SOCIAL_LOGIN_FAILED,
      )
        .addProperties({
          account_type: `default_${authConnection}`,
          is_rehydration: userClickedRehydration,
          failure_type: isUserCancelled ? 'user_cancelled' : 'error',
          error_category: errorCategory,
        })
        .build(),
    );
  };

  handleOAuthLogin = async (
    loginHandler: BaseLoginHandler,
    userClickedRehydration: boolean,
  ): Promise<HandleOAuthLoginResult> => {
    const web3AuthNetwork = this.config.web3AuthNetwork;

    if (this.localState.loginInProgress) {
      throw new OAuthError(
        'Login already in progress',
        OAuthErrorType.LoginInProgress,
      );
    }
    this.updateLocalState({ userClickedRehydration });
    this.#dispatchLogin();

    try {
      let result: LoginHandlerResult,
        data: AuthResponse,
        handleCodeFlowResult: HandleOAuthLoginResult;
      let providerLoginSuccess = false;
      try {
        trace({
          name: TraceName.OnboardingOAuthProviderLogin,
          op: TraceOperation.OnboardingSecurityOp,
        });
        const loginResult = await loginHandler.login();
        if (!loginResult) {
          throw new OAuthError(
            'Login handler return empty result',
            OAuthErrorType.LoginError,
          );
        }
        result = loginResult;
        providerLoginSuccess = true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        trace({
          name: TraceName.OnboardingOAuthProviderLoginError,
          op: TraceOperation.OnboardingError,
          tags: { errorMessage },
        });
        endTrace({ name: TraceName.OnboardingOAuthProviderLoginError });

        this.#trackSocialLoginFailure({
          authConnection: loginHandler.authConnection,
          errorCategory: 'provider_login',
          error,
        });

        throw error;
      } finally {
        endTrace({
          name: TraceName.OnboardingOAuthProviderLogin,
          data: { success: providerLoginSuccess },
        });
      }

      const authConnection = loginHandler.authConnection;

      Logger.log('handleOAuthLogin: before getAuthToken');
      if (result) {
        let getAuthTokensSuccess = false;
        try {
          trace({
            name: TraceName.OnboardingOAuthBYOAServerGetAuthTokens,
            op: TraceOperation.OnboardingSecurityOp,
          });
          data = await loginHandler.getAuthTokens(
            { ...result, web3AuthNetwork },
            this.config.authServerUrl,
          );
          if (!data.id_token) {
            throw new OAuthError('No token found', OAuthErrorType.LoginError);
          }
          getAuthTokensSuccess = true;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          trace({
            name: TraceName.OnboardingOAuthBYOAServerGetAuthTokensError,
            op: TraceOperation.OnboardingError,
            tags: { errorMessage },
          });
          endTrace({
            name: TraceName.OnboardingOAuthBYOAServerGetAuthTokensError,
          });

          this.#trackSocialLoginFailure({
            authConnection,
            errorCategory: 'get_auth_tokens',
            error,
          });

          throw error;
        } finally {
          endTrace({
            name: TraceName.OnboardingOAuthBYOAServerGetAuthTokens,
            data: { success: getAuthTokensSuccess },
          });
        }

        const jwtPayload = JSON.parse(
          loginHandler.decodeIdToken(data.id_token),
        ) as Partial<OAuthUserInfo>;
        const userId = jwtPayload.sub ?? '';
        const accountName = jwtPayload.email ?? '';

        this.updateLocalState({
          userId,
          accountName,
        });

        let seedlessAuthSuccess = false;
        try {
          trace({
            name: TraceName.OnboardingOAuthSeedlessAuthenticate,
            op: TraceOperation.OnboardingSecurityOp,
          });
          handleCodeFlowResult = await this.handleSeedlessAuthenticate(
            data,
            authConnection,
          );
          seedlessAuthSuccess = true;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          trace({
            name: TraceName.OnboardingOAuthSeedlessAuthenticateError,
            op: TraceOperation.OnboardingError,
            tags: { errorMessage },
          });
          endTrace({
            name: TraceName.OnboardingOAuthSeedlessAuthenticateError,
          });

          this.#trackSocialLoginFailure({
            authConnection,
            errorCategory: 'seedless_auth',
            error,
          });

          throw error;
        } finally {
          endTrace({
            name: TraceName.OnboardingOAuthSeedlessAuthenticate,
            data: { success: seedlessAuthSuccess },
          });
        }

        this.#dispatchPostLogin(handleCodeFlowResult);
        return handleCodeFlowResult;
      }
      throw new OAuthError('No result', OAuthErrorType.LoginError);
    } catch (error) {
      Logger.log(error as Error, {
        message: 'handleOAuthLogin',
      });
      this.#dispatchPostLogin({
        type: OAuthLoginResultType.ERROR,
        existingUser: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthError(
        error instanceof Error ? error : 'Unknown error',
        OAuthErrorType.LoginError,
      );
    }
  };

  updateLocalState = (newState: Partial<OAuthService['localState']>) => {
    this.localState = {
      ...this.localState,
      ...newState,
    };
  };

  getAuthDetails = () => ({
    authConnectionConfig: this.config.authConnectionConfig,
    userId: this.localState.userId,
  });

  clearAuthDetails = () => {
    this.updateLocalState({
      userId: undefined,
      accountName: undefined,
    });
  };

  resetOauthState = () => {
    this.updateLocalState({
      loginInProgress: false,
      oauthLoginSuccess: false,
      oauthLoginError: null,
    });
  };

  private getAccessToken = (): string | undefined =>
    Engine.context.SeedlessOnboardingController.state?.accessToken;

  updateMarketingOptInStatus = async (
    marketingOptIn: boolean,
  ): Promise<void> => {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('No access token found. User must be authenticated.');
    }

    const requestBody: MarketingOptInRequest = {
      opt_in_status: marketingOptIn,
    };

    const url = `${this.config.authServerUrl}${AUTH_SERVER_MARKETING_OPT_IN_PATH}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to update marketing opt-in status: ${response.status} - ${
          errorData.message || response.statusText
        }`,
      );
    }
  };

  getMarketingOptInStatus = async (): Promise<MarketingOptInResponse> => {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('No access token found. User must be authenticated.');
    }

    const url = `${this.config.authServerUrl}${AUTH_SERVER_MARKETING_OPT_IN_PATH}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get marketing opt-in status: ${response.status} - ${
          errorData.message || response.statusText
        }`,
      );
    }

    const data: MarketingOptInResponse = await response.json();
    return data;
  };
}

export default new OAuthService({
  web3AuthNetwork: currentWeb3AuthNetwork as Web3AuthNetwork,
  authConnectionConfig: AuthConnectionConfig,
  authServerUrl: AuthServerUrl,
});
