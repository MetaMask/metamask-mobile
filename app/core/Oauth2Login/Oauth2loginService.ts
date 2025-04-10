import {
    Platform
} from 'react-native';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import ReduxService from '../redux';

import { signInAsync, AppleAuthenticationScope } from 'expo-apple-authentication';
import {
    AuthRequest,
    ResponseType,
    CodeChallengeMethod,
    AuthSessionResult,
  } from 'expo-auth-session';
import {signInWithGoogle} from 'react-native-google-acm';

import { ACTIONS, PREFIXES } from '../../constants/deeplinks';
import { OAuthVerifier } from '@metamask/seedless-onboarding-controller';
import { UserActionType } from '../../actions/user';

// to be get from enviroment variable
const ByoaServerUrl = 'https://api-develop-torus-byoa.web3auth.io';
const Web3AuthNetwork = 'sapphire_devnet';
const AppRedirectUri = `${PREFIXES.METAMASK}${ACTIONS.OAUTH2_REDIRECT}`;

const IosGID = '882363291751-nbbp9n0o307cfil1lup766g1s99k0932.apps.googleusercontent.com';
const IosGoogleRedirectUri = 'com.googleusercontent.apps.882363291751-nbbp9n0o307cfil1lup766g1s99k0932:/oauth2redirect/google';

const AndroidGoogleWebGID = '882363291751-2a37cchrq9oc1lfj1p419otvahnbhguv.apps.googleusercontent.com';
const AppleServerRedirectUri = `${ByoaServerUrl}/api/v1/oauth/callback`;
const AppleWebClientId = 'com.web3auth.appleloginextension';



export type HandleOauth2LoginResult = ({type: 'pending'} | {type: AuthSessionResult['type'], existingUser: boolean} | {type: 'error', error: string});
export type LoginProvider = 'apple' | 'google';
export type LoginMode = 'onboarding' | 'change-password';


interface HandleFlowParams {
    provider: LoginProvider;
    code?: string;
    idToken?: string;
    clientId: string;
    redirectUri?: string;
    codeVerifier?: string;
    web3AuthNetwork?: string;
}

interface ByoaResponse {
    id_token: string;
    verifier: string;
    verifier_id: string;
    indexes: Record<string, number>;
    endpoints: Record<string, string>;
    success: boolean;
    message: string;
    jwt_tokens: Record<string, string>;
}

export class Oauth2LoginService {
    public localState: {
        codeVerifier: string | null;
        verifier: OAuthVerifier | null;
        verifierID: string | null;
    };


    constructor() {
        this.localState = {
            codeVerifier: null,
            verifier: null,
            verifierID: null,
        };
        ReduxService.store.dispatch({
            type: UserActionType.OAUTH2_LOGIN_RESET,
        });
    }

    #iosHandleOauth2Login = async (provider: LoginProvider, mode: LoginMode) : Promise<HandleOauth2LoginResult> => {
        try {
            if (provider === 'apple') {
                const credential = await signInAsync({
                    requestedScopes: [
                        AppleAuthenticationScope.FULL_NAME,
                        AppleAuthenticationScope.EMAIL,
                    ],
                });
                if (credential.identityToken) {
                    return await this.handleCodeFlow({
                            provider: 'apple',
                            idToken: credential.identityToken,
                            clientId: IosGID,
                    } );
                }
                return {type: 'dismiss', existingUser: false};
            } else if (provider === 'google') {
                const state = JSON.stringify({
                    mode,
                    random: Math.random().toString(36).substring(2, 15),
                });
                const authRequest = new AuthRequest({
                    clientId: IosGID,
                    redirectUri: IosGoogleRedirectUri,
                    scopes: ['email', 'profile'],
                    responseType: ResponseType.Code,
                    codeChallengeMethod: CodeChallengeMethod.S256,
                    usePKCE: true,
                    state,
                });
                const result = await authRequest.promptAsync({
                    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                });

                if (result.type === 'success') {
                    return this.handleCodeFlow({
                        provider: 'google',
                        code: result.params.code, // result.params.idToken
                        clientId: IosGID,
                        redirectUri: IosGoogleRedirectUri,
                        codeVerifier: authRequest.codeVerifier,
                    });
                }
                return {...result, existingUser: false};
            }
            throw new Error('Invalid provider : ' + provider);
        } catch (error) {
            Logger.error( error as Error, {
                message: 'iosHandleOauth2Login',
                provider,
            } );
            return {type: 'error', existingUser: false};
        }
    };

    #androidHandleOauth2Login = async (provider: LoginProvider, mode: LoginMode) : Promise<HandleOauth2LoginResult> => {
        try {
            if (provider === 'apple') {
                const state = JSON.stringify({
                    provider: 'apple',
                    client_redirect_back_uri: AppRedirectUri,
                    redirectUri: AppleServerRedirectUri,
                    clientId: AppleWebClientId,
                    random: Math.random().toString(36).substring(2, 15),
                    mode,
                });
                const authRequest = new AuthRequest({
                    clientId: AppleWebClientId,
                    redirectUri: AppleServerRedirectUri,
                    scopes: ['email', 'name'],
                    responseType: ResponseType.Code,
                    codeChallengeMethod: CodeChallengeMethod.S256,
                    usePKCE: false,
                    state,
                    extraParams: {
                        response_mode: 'form_post',
                    }
                });

                // result return type `dismissed` which is hard to differentiate between dismissed or pending redirect url
                const _ = await authRequest.promptAsync({
                    authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
                });
                this.localState.codeVerifier = authRequest.codeVerifier ?? null;

                // Apple login use redirect flow thus no handleCodeFlow here
                return {type: 'pending'};
            } else if (provider === 'google') {
                const result = await signInWithGoogle({
                    serverClientId: AndroidGoogleWebGID,
                    nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                    autoSelectEnabled: true,
                });
                Logger.log('handleGoogleLogin: result', result);

                if (result.idToken === 'google-signin') {
                    return this.handleCodeFlow({
                        provider: 'google',
                        idToken: result.idToken,
                        clientId: AndroidGoogleWebGID,
                    });
                }
                throw new Error('login failed : ' + provider);
            }
            throw new Error('Invalid provider : ' + provider);
        } catch (error) {
            Logger.log('handleGoogleLogin: error', error);
            return {type: 'error', existingUser: false, error: error instanceof Error ? error.message : 'Unknown error'};
        }
    };

    handleCodeFlow = async (params : HandleFlowParams) : Promise<{type: 'success' | 'error', error?: string, existingUser : boolean}> => {
        const {code, idToken, provider, clientId, redirectUri, codeVerifier, web3AuthNetwork} = params;

        const pathname = code ? 'api/v1/oauth/token' : 'api/v1/oauth/id_token';
        const body = code ? {
            code,
            client_id: clientId,
            login_provider: provider,
            network: web3AuthNetwork ?? Web3AuthNetwork,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        } : {
            id_token: idToken,
            client_id: clientId,
            login_provider: provider,
            network: web3AuthNetwork ?? Web3AuthNetwork,
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
                this.localState.verifier = data.verifier as OAuthVerifier;
                this.localState.verifierID = data.verifier_id;

                const result = await Engine.context.SeedlessOnboardingController.authenticateOAuthUser({
                    idTokens: Object.values(data.jwt_tokens),
                    verifier: data.verifier as OAuthVerifier,
                    verifierID: data.verifier_id,
                    indexes: Object.values(data.indexes),
                    endpoints: Object.values(data.endpoints),
                });
                Logger.log('handleCodeFlow: result', result);
                return {type: 'success', existingUser: result.hasValidEncKey};
            }
            throw new Error('Failed to authenticate OAuth user : ' + data.message);
        } catch (error) {
            Logger.error( error as Error, {
                message: 'handleCodeFlow',
            } );
            return {type: 'error', existingUser: false, error: error instanceof Error ? error.message : 'Unknown error'};
        } finally {
            this.localState.codeVerifier = null;
        }
    };

    handleOauth2Login = async (provider: LoginProvider, mode: LoginMode) : Promise<HandleOauth2LoginResult> => {
        const state = ReduxService.store.getState();
        if (state.user.oauth2LoginInProgress) {
            throw new Error('Login already in progress');
        }
        ReduxService.store.dispatch({
            type: UserActionType.LOADING_SET,
            payload: {
                loadingMsg: 'Logging in...',
            },
        });
        ReduxService.store.dispatch({
            type: UserActionType.OAUTH2_LOGIN,
        });

        let result;
        if (Platform.OS === 'ios') {
            result = await this.#iosHandleOauth2Login(provider, mode);
        } else if (Platform.OS === 'android') {
            result = await this.#androidHandleOauth2Login(provider, mode);
        }

        if (result === undefined) {
            this.localState.loginInProgress = false;
            ReduxService.store.dispatch({
                type: UserActionType.OAUTH2_LOGIN_ERROR,
                payload: {
                    error: 'Invalid platform',
                },
            });
            throw new Error('Invalid platform');
        }

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
        } else if (result.type === 'pending') {
            setTimeout(() => {
                ReduxService.store.dispatch({
                    type: UserActionType.OAUTH2_LOGIN_COMPLETE,
                });
            }, 10000);
        } else {
            ReduxService.store.dispatch({
                type: UserActionType.OAUTH2_LOGIN_RESET,
            });
        }

        if ( result.type !== 'pending') {
            ReduxService.store.dispatch({
                type: UserActionType.LOADING_UNSET,
            });
        } else {
            setTimeout(() => {
                ReduxService.store.dispatch({
                    type: UserActionType.LOADING_UNSET,
                });
            }, 10000);
        }

        return result;
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

export default new Oauth2LoginService();
