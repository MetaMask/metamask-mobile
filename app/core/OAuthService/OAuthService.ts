import Engine from '../Engine';
import Logger from '../../util/Logger';
import { trace, endTrace, TraceName, TraceOperation } from '../../util/trace';

import {
  HandleOAuthLoginResult,
  AuthConnection,
  AuthResponse,
  OAuthUserInfo,
  OAuthLoginResultType,
  MarketingOptInRequest,
} from './OAuthInterface';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import {
  AuthConnectionConfig,
  AuthServerUrl,
  web3AuthNetwork as currentWeb3AuthNetwork,
  SupportedPlatforms,
} from './OAuthLoginHandlers/constants';
import { OAuthError, OAuthErrorType } from './error';
import { BaseLoginHandler } from './OAuthLoginHandlers/baseHandler';
import { Platform } from 'react-native';

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
    this.updateLocalState({ loginInProgress: true });
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
    authConnection: AuthConnection,
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

      const result =
        await Engine.context.SeedlessOnboardingController.authenticate({
          idTokens: [data.id_token],
          authConnection,
          authConnectionId: authConnectionConfig.authConnectionId,
          groupedAuthConnectionId: authConnectionConfig.groupedAuthConnectionId,
          userId,
          socialLoginEmail: accountName,
          refreshToken: data.refresh_token,
          revokeToken: data.revoke_token,
          accessToken: data.access_token,
          metadataAccessToken: data.metadata_access_token,
        });
      Logger.log('handleCodeFlow: result', result);
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

  handleOAuthLogin = async (
    loginHandler: BaseLoginHandler,
  ): Promise<HandleOAuthLoginResult> => {
    const web3AuthNetwork = this.config.web3AuthNetwork;

    if (this.localState.loginInProgress) {
      throw new OAuthError(
        'Login already in progress',
        OAuthErrorType.LoginInProgress,
      );
    }
    this.#dispatchLogin();

    try {
      let result, data, handleCodeFlowResult;
      let providerLoginSuccess = false;
      try {
        trace({
          name: TraceName.OnboardingOAuthProviderLogin,
          op: TraceOperation.OnboardingSecurityOp,
        });
        result = await loginHandler.login();
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

        throw error;
      } finally {
        endTrace({
          name: TraceName.OnboardingOAuthProviderLogin,
          data: { success: providerLoginSuccess },
        });
      }

      const authConnection = loginHandler.authConnection;

      Logger.log('handleOAuthLogin: result', result);
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

          throw error;
        } finally {
          endTrace({
            name: TraceName.OnboardingOAuthBYOAServerGetAuthTokens,
            data: { success: getAuthTokensSuccess },
          });
        }

        if (!data.id_token) {
          throw new OAuthError('No token found', OAuthErrorType.LoginError);
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

  /**
   * Update marketing opt-in status for the authenticated user
   * @param marketingOptIn - Whether the user has opted in to marketing communications
   * @returns Promise<void> - Resolves when the API call is successful
   */
  updateMarketingOptInStatus = async (
    marketingOptIn: boolean,
  ): Promise<void> => {
    try {
      // Get access token from SeedlessOnboardingController state
      const accessToken =
        Engine.context.SeedlessOnboardingController.state?.accessToken;

      if (!accessToken) {
        throw new Error('No access token found. User must be authenticated.');
      }

      const requestBody: MarketingOptInRequest = {
        opt_in_status: marketingOptIn,
      };

      const response = await fetch(
        `https://auth-service.dev-api.cx.metamask.io/api/v1/oauth/marketing-opt-in`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to update marketing opt-in status: ${response.status} - ${
            errorData.message || response.statusText
          }`,
        );
      }

      Logger.log('updateMarketingOptInStatus: success', {
        marketingOptIn,
        status: response.status,
      });
    } catch (error) {
      Logger.log(error as Error, {
        message: 'updateMarketingOptInStatus',
        marketingOptIn,
      });

      throw error;
    }
  };
}

export default new OAuthService({
  web3AuthNetwork: currentWeb3AuthNetwork as Web3AuthNetwork,
  authConnectionConfig: AuthConnectionConfig,
  authServerUrl: AuthServerUrl,
});
