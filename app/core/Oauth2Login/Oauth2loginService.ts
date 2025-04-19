import {
    Platform
} from 'react-native';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import ReduxService from '../redux';

import { OAuthVerifier } from '@metamask/seedless-onboarding-controller';
import { UserActionType } from '../../actions/user';
import { handleAndroidAppleLogin } from './android/apple';
import { handleAndroidGoogleLogin } from './android/google';
import { ByoaResponse, HandleFlowParams, ByoaServerUrl, HandleOauth2LoginResult, LoginProvider, Web3AuthNetwork, DefaultWeb3AuthNetwork } from './Oauth2loginInterface';
import { handleIosGoogleLogin } from './ios/google';
import { handleIosAppleLogin } from './ios/apple';
import { jwtDecode, JwtPayload } from 'jwt-decode';

export class Oauth2LoginService {
    public localState: {
        loginInProgress: boolean;
        verifier: OAuthVerifier | null;
        verifierID: string | null;
    };

    public config : {
        web3AuthNetwork: Web3AuthNetwork;
    };

    constructor(config: {web3AuthNetwork: Web3AuthNetwork}) {
        this.localState = {
            loginInProgress: false,
            verifier: null,
            verifierID: null,
        };
        this.config = {
            web3AuthNetwork: config.web3AuthNetwork,
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

    #iosHandleOauth2Login = async (provider: LoginProvider) : Promise<HandleFlowParams | undefined> => {
        if (provider === 'apple') {
            const result = await handleIosAppleLogin();
            return result;
        } else if (provider === 'google') {
            const result = await handleIosGoogleLogin();
            return result;
        }
        throw new Error('Invalid provider : ' + provider);
    };

    #androidHandleOauth2Login = async (provider: LoginProvider) : Promise<HandleFlowParams | undefined> => {
        if (provider === 'apple') {
            const result = await handleAndroidAppleLogin();
            return result;
        } else if (provider === 'google') {
            const result = await handleAndroidGoogleLogin();
            return result;
        }
        throw new Error('Invalid provider : ' + provider);

    };

    handleCodeFlow = async (params : HandleFlowParams & {web3AuthNetwork: Web3AuthNetwork}) : Promise<{type: 'success' | 'error', error?: string, existingUser : boolean, accountName?: string}> => {
        const {code, idToken, provider, clientId, redirectUri, codeVerifier, web3AuthNetwork} = params;

        const pathname = code ? 'api/v1/oauth/token' : 'api/v1/oauth/id_token';
        const body = code ? {
            code,
            client_id: clientId,
            login_provider: provider,
            network: web3AuthNetwork,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        } : {
            id_token: idToken,
            client_id: clientId,
            login_provider: provider,
            network: web3AuthNetwork,
        };

        Logger.log('handleCodeFlow: body', body);
        try {
            const res = await fetch(`${ByoaServerUrl}/${pathname}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await res.json() as ByoaResponse;
            Logger.log('handleCodeFlow: data', data);
            if (data.success) {
                this.updateLocalState({
                    verifier: data.verifier as OAuthVerifier,
                    verifierID: data.verifier_id,
                });

                const result = await Engine.context.SeedlessOnboardingController.authenticateOAuthUser({
                    idTokens: Object.values(data.jwt_tokens),
                    verifier: data.verifier as OAuthVerifier,
                    verifierID: data.verifier_id,
                    indexes: Object.values(data.indexes),
                    endpoints: Object.values(data.endpoints),
                });
                Logger.log('handleCodeFlow: result', result);

                const finalToken = idToken ?? data.id_token;
                const jwtPayload = jwtDecode(finalToken) as JwtPayload & {email: string};
                const accountName = jwtPayload.email ?? '';

                return {type: 'success', existingUser: result.hasValidEncKey, accountName};
            }
            throw new Error('Failed to authenticate OAuth user : ' + data.message);
        } catch (error) {
            Logger.error( error as Error, {
                message: 'handleCodeFlow',
            } );
            return {type: 'error', existingUser: false, error: error instanceof Error ? error.message : 'Unknown error'};
        }
    };

    handleOauth2Login = async (provider: LoginProvider) : Promise<HandleOauth2LoginResult> => {
        const web3AuthNetwork = this.config.web3AuthNetwork;

        if (this.localState.loginInProgress) {
            throw new Error('Login already in progress');
        }
        this.#dispatchLogin();

        try {
            let result;
            if (Platform.OS === 'ios') {
                result = await this.#iosHandleOauth2Login(provider);
            } else if (Platform.OS === 'android') {
                result = await this.#androidHandleOauth2Login(provider);
            } else {
                throw new Error('Invalid platform');
            }

            Logger.log('handleOauth2Login: result', result);
            if (result) {
                const handleCodeFlowResult = await this.handleCodeFlow({...result , web3AuthNetwork});
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
        verifier: this.localState.verifier,
        verifierID: this.localState.verifierID,
    });

    clearVerifierDetails = () => {
        this.localState.verifier = null;
        this.localState.verifierID = null;
    };
}

export default new Oauth2LoginService({web3AuthNetwork: DefaultWeb3AuthNetwork});
