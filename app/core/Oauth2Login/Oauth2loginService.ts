import {
    Platform
} from 'react-native';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import ReduxService from '../redux';

import { UserActionType } from '../../actions/user';
import { HandleOauth2LoginResult, AuthConnection, GroupedAuthConnectionId, AuthConnectionId, AuthResponse, OAuthUserInfo } from './Oauth2loginInterface';
import { jwtDecode } from 'jwt-decode';
import { TOPRFNetwork } from '../Engine/controllers/seedless-onboarding-controller';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { AuthServerUrl, createLoginHandler, getAuthTokens } from './Oauth2LoginHandler';

export interface Oauth2LoginServiceConfig {
    authConnectionId: string;
    groupedAuthConnectionId: string;
    web3AuthNetwork: Web3AuthNetwork;
    authServerUrl: string;
}

export class Oauth2LoginService {
    public localState: {
        loginInProgress: boolean;
        userId: string | null;
    };

    public config : Oauth2LoginServiceConfig;

    constructor(config: Oauth2LoginServiceConfig) {
        const { authServerUrl, web3AuthNetwork, authConnectionId, groupedAuthConnectionId} = config;
        this.localState = {
            loginInProgress: false,
            userId: null,
        };
        this.config = {
            authConnectionId,
            groupedAuthConnectionId,
            web3AuthNetwork,
            authServerUrl
        };
    }

    #dispatchLogin = () =>{
        this.updateLocalState({loginInProgress: true});
        ReduxService.store.dispatch({
            type: UserActionType.LOADING_SET,
            payload: {
                loadingMsg: 'Logging in...',
            },
        });
    };

    #dispatchPostLogin = (result: HandleOauth2LoginResult) => {
        this.updateLocalState({loginInProgress: false});
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

    handleSeedlessAuthenticate = async (data : AuthResponse, authConnection: AuthConnection) : Promise<{type: 'success' | 'error', error?: string, existingUser : boolean, accountName?: string}> => {
        try {
            if (!data.jwt_tokens.metamask) {
                throw new Error('No token found');
            }

            const jwtPayload = jwtDecode(data.jwt_tokens.metamask) as Partial<OAuthUserInfo>;
            const userId = jwtPayload.sub ?? '';
            const accountName = jwtPayload.email ?? '';

            this.updateLocalState({
                userId,
            });

            const result = await Engine.context.SeedlessOnboardingController.authenticate({
                idTokens: Object.values(data.jwt_tokens),
                authConnection,
                authConnectionId: this.config.authConnectionId,
                groupedAuthConnectionId: this.config.groupedAuthConnectionId,
                userId,
                socialLoginEmail : accountName,
            });
            Logger.log('handleCodeFlow: result', result);
            return {type: 'success', existingUser: !result.isNewUser, accountName};
        } catch (error) {
            Logger.error( error as Error, {
                message: 'handleCodeFlow',
            } );
            return {type: 'error', existingUser: false, error: error instanceof Error ? error.message : 'Unknown error'};
        }
    };

    handleOauth2Login = async (authConnection: AuthConnection) : Promise<HandleOauth2LoginResult> => {
        const web3AuthNetwork = this.config.web3AuthNetwork;

        if (this.localState.loginInProgress) {
            throw new Error('Login already in progress');
        }
        this.#dispatchLogin();

        try {
            const loginHandler = createLoginHandler(Platform.OS, authConnection);
            const result = await loginHandler.login();

            Logger.log('handleOauth2Login: result', result);
            if (result) {
                const data = await getAuthTokens( {...result, web3AuthNetwork}, this.config.authServerUrl);
                const handleCodeFlowResult = await this.handleSeedlessAuthenticate(data, authConnection);
                this.#dispatchPostLogin(handleCodeFlowResult);
                return handleCodeFlowResult;
            }
            this.#dispatchPostLogin({type: 'dismiss', existingUser: false});
            return {type: 'dismiss', existingUser: false};
        } catch (error) {
            Logger.error( error as Error, {
                message: 'handleOauth2Login',
            } );
            this.#dispatchPostLogin({type: 'error', existingUser: false, error: error instanceof Error ? error.message : 'Unknown error'});
            return {type: 'error', existingUser: false, error: error instanceof Error ? error.message : 'Unknown error'};
        }
    };

    updateLocalState = (newState: Partial<Oauth2LoginService['localState']>) => {
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
        this.localState.userId = null;
    };
}

export default new Oauth2LoginService({web3AuthNetwork: TOPRFNetwork, authConnectionId: AuthConnectionId, groupedAuthConnectionId: GroupedAuthConnectionId, authServerUrl: AuthServerUrl});
