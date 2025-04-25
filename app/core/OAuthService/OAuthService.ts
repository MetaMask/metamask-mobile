import { Platform } from 'react-native';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import ReduxService from '../redux';

import { UserActionType } from '../../actions/user';
import {
  HandleOAuthLoginResult,
  AuthConnection,
  AuthResponse,
  OAuthUserInfo,
} from './OAuthInterface';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { createLoginHandler } from './OAuthLoginHandlers';
import {
  AuthServerUrl,
  web3AuthNetwork as currentWeb3AuthNetwork,
} from './OAuthLoginHandlers/constants';
import { OAuthError, OAuthErrorType } from './error';

export const AuthConnectionId = process.env.AUTH_CONNECTION_ID;
export const GroupedAuthConnectionId = process.env.GROUPED_AUTH_CONNECTION_ID;

export interface OAuthServiceConfig {
  authConnectionId: string;
  groupedAuthConnectionId?: string;
  web3AuthNetwork: Web3AuthNetwork;
  authServerUrl: string;
}

export class OAuthService {
  public localState: {
    loginInProgress: boolean;
    userId?: string;
    accountName?: string;
  };

  public config: OAuthServiceConfig;

  constructor(config: OAuthServiceConfig) {
    const {
      authServerUrl,
      web3AuthNetwork,
      authConnectionId,
      groupedAuthConnectionId,
    } = config;
    this.localState = {
      loginInProgress: false,
      userId: undefined,
      accountName: undefined,
    };
    this.config = {
      authConnectionId,
      groupedAuthConnectionId,
      web3AuthNetwork,
      authServerUrl,
    };
  }

  #dispatchLogin = () => {
    this.updateLocalState({ loginInProgress: true });
    ReduxService.store.dispatch({
      type: UserActionType.LOADING_SET,
      payload: {
        loadingMsg: 'Logging in...',
      },
    });
  };

  #dispatchPostLogin = (result: HandleOAuthLoginResult) => {
    this.updateLocalState({ loginInProgress: false });
    if (result.type === 'success') {
      ReduxService.store.dispatch({
        type: UserActionType.OAUTH2_LOGIN_SUCCESS,
        payload: {
          existingUser: result.existingUser,
        },
      });
    } else if (result.type === 'error' && 'error' in result) {
      this.clearVerifierDetails();
      ReduxService.store.dispatch({
        type: UserActionType.OAUTH2_LOGIN_ERROR,
        payload: {
          error: result.error,
        },
      });
    } else {
      ReduxService.store.dispatch({
        type: UserActionType.OAUTH2_LOGIN_RESET,
      });
    }
    ReduxService.store.dispatch({
      type: UserActionType.LOADING_UNSET,
    });
  };

  handleSeedlessAuthenticate = async (
    data: AuthResponse,
    authConnection: AuthConnection,
  ): Promise<{
    type: 'success' | 'error';
    error?: string;
    existingUser: boolean;
    accountName?: string;
  }> => {
    try {
      const { userId, accountName } = this.localState;

      if (!userId) {
        throw new Error('No user id found');
      }

      const result =
        await Engine.context.SeedlessOnboardingController.authenticate({
          idTokens: Object.values(data.jwt_tokens),
          authConnection,
          authConnectionId: this.config.authConnectionId,
          groupedAuthConnectionId: this.config.groupedAuthConnectionId,
          userId,
          socialLoginEmail: accountName,
        });
      Logger.log('handleCodeFlow: result', result);
      return { type: 'success', existingUser: !result.isNewUser, accountName };
    } catch (error) {
      Logger.error(error as Error, {
        message: 'handleCodeFlow',
      });
      throw error;
    }
  };

  handleOAuth2Login = async (
    authConnection: AuthConnection,
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
      const loginHandler = createLoginHandler(Platform.OS, authConnection);
      const result = await loginHandler.login();

      Logger.log('handleOAuthLogin: result', result);
      if (result) {
        const data = await loginHandler.getAuthTokens(
          { ...result, web3AuthNetwork },
          this.config.authServerUrl,
        );
        const audience = 'metamask';

        if (!data.jwt_tokens[audience]) {
          throw new OAuthError('No token found', OAuthErrorType.LoginError);
        }

        const jwtPayload = JSON.parse(
          loginHandler.decodeIdToken(data.jwt_tokens[audience]),
        ) as Partial<OAuthUserInfo>;
        const userId = jwtPayload.sub ?? '';
        const accountName = jwtPayload.email ?? '';

        this.updateLocalState({
          userId,
          accountName,
        });
        const handleCodeFlowResult = await this.handleSeedlessAuthenticate(
          data,
          authConnection,
        );
        this.#dispatchPostLogin(handleCodeFlowResult);
        return handleCodeFlowResult;
      }
      this.#dispatchPostLogin({ type: 'dismiss', existingUser: false });
      return { type: 'dismiss', existingUser: false };
    } catch (error) {
      this.#dispatchPostLogin({
        type: 'error',
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

  getVerifierDetails = () => ({
    authConnectionId: this.config.authConnectionId,
    groupedAuthConnectionId: this.config.groupedAuthConnectionId,
    userId: this.localState.userId,
  });

  clearVerifierDetails = () => {
    this.localState.userId = undefined;
    this.localState.accountName = undefined;
  };
}

if (!AuthServerUrl || !AuthConnectionId || !GroupedAuthConnectionId) {
  throw new Error('Missing environment variables');
}

export default new OAuthService({
  web3AuthNetwork: currentWeb3AuthNetwork as Web3AuthNetwork,
  authConnectionId: AuthConnectionId,
  groupedAuthConnectionId: GroupedAuthConnectionId,
  authServerUrl: AuthServerUrl,
});
