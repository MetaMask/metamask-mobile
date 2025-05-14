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
  OAuthLoginResultType,
} from './OAuthInterface';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import {
  AuthConnectionId,
  AuthServerUrl,
  web3AuthNetwork as currentWeb3AuthNetwork,
  GroupedAuthConnectionId,
} from './OAuthLoginHandlers/constants';
import { OAuthError, OAuthErrorType } from './error';
import { BaseLoginHandler } from './OAuthLoginHandlers/baseHandler';

export interface OAuthServiceConfig {
  authConnectionId: string;
  groupedAuthConnectionId?: string;
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
      oauthLoginSuccess: false,
      oauthLoginError: null,
    };
    this.config = {
      authConnectionId,
      groupedAuthConnectionId,
      web3AuthNetwork,
      authServerUrl,
    };
  }

  #dispatchLogin = () => {
    this.resetOauthState();
    this.updateLocalState({ loginInProgress: true });
    ReduxService.store.dispatch({
      type: UserActionType.LOADING_SET,
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
    ReduxService.store.dispatch({
      type: UserActionType.LOADING_UNSET,
    });
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
      const result = await loginHandler.login();
      const authConnection = loginHandler.authConnection;

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
    authConnectionId: this.config.authConnectionId,
    groupedAuthConnectionId: this.config.groupedAuthConnectionId,
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
}

export default new OAuthService({
  web3AuthNetwork: currentWeb3AuthNetwork as Web3AuthNetwork,
  authConnectionId: AuthConnectionId,
  groupedAuthConnectionId: GroupedAuthConnectionId,
  authServerUrl: AuthServerUrl,
});
