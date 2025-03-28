import { signInAsync, AppleAuthenticationScope } from 'expo-apple-authentication';
import { Platform } from 'react-native';
import {
    AuthRequest,
    ResponseType,
    CodeChallengeMethod,
    AuthSessionResult,
  } from 'expo-auth-session';
import {signInWithGoogle} from 'react-native-google-acm';
import DevLogger from '../../core/SDKConnect/utils/DevLogger';
import { ACTIONS, PREFIXES } from '../../constants/deeplinks';
import Engine from '../../core/Engine';

const byoaServerUrl = 'https://api-develop-torus-byoa.web3auth.io';
// const byoaServerUrl = 'https://organic-gannet-privately.ngrok-free.app';
const Web3AuthNetwork = 'sapphire-testnet';
const AppRedirect = `${PREFIXES.METAMASK}${ACTIONS.OAUTH2_REDIRECT}`;

const IosGID = '882363291751-nbbp9n0o307cfil1lup766g1s99k0932.apps.googleusercontent.com';
const IosGoogleRedirectUri = 'com.googleusercontent.apps.882363291751-nbbp9n0o307cfil1lup766g1s99k0932:/oauth2redirect/google';

const AndroidWebGID = '882363291751-2a37cchrq9oc1lfj1p419otvahnbhguv.apps.googleusercontent.com';
const AndroidGID = AndroidWebGID;
const AppleServerRedirectUri = `${byoaServerUrl}/api/v1/oauth/callback`;

const AppleWebClientId = 'com.web3auth.appleloginextension';

interface HandleFlowParams {
    provider: 'apple' | 'google';
    code?: string;
    idToken?: string;
    clientId: string;
    redirectUri?: string;
    codeVerifier?: string;
    web3AuthNetwork?: string;
}

type HandleOauth2LoginResult = {type: 'pending'} | {type: AuthSessionResult['type']};

export const handleCodeFlow = async (params : HandleFlowParams) : Promise<{status: 'success' | 'error', error?: string}> => {
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

    const res = await fetch(`${byoaServerUrl}/${pathname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log('handleCodeFlow: data', data);
    // await Engine.context.SeedlessOnboardingController.authenticateOAuthUser(data);
    return {status: 'success'};
};


const iosHandleOauth2Login = async (provider: 'apple' | 'google') : Promise<HandleOauth2LoginResult> => {
    try {
        if (provider === 'apple') {
            const credential = await signInAsync({
                requestedScopes: [
                    AppleAuthenticationScope.FULL_NAME,
                    AppleAuthenticationScope.EMAIL,
                ],
            });
            if (credential.identityToken) {
                await handleCodeFlow({
                        provider: 'apple',
                        idToken: credential.identityToken,
                        clientId: IosGID,
                });
                return {type: 'success'};
            }
            return {type: 'dismiss'};
        } else if (provider === 'google') {
            const authRequest = new AuthRequest({
                clientId: IosGID,
                redirectUri: IosGoogleRedirectUri,
                scopes: ['email', 'profile'],
                responseType: ResponseType.Code,
                codeChallengeMethod: CodeChallengeMethod.S256,
                usePKCE: true,
            });
            const result = await authRequest.promptAsync({
                authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
            });

            if (result.type === 'success') {
                await handleCodeFlow({
                    provider: 'google',
                    code: result.params.code, // result.params.idToken
                    clientId: IosGID,
                    redirectUri: IosGoogleRedirectUri,
                    codeVerifier: authRequest.codeVerifier,
                });
            }
            return result;
        }
        throw new Error('Invalid provider : ' + provider);
    } catch (error) {
        console.log('handleGoogleLogin: error', error);
        DevLogger.log('handleGoogleLogin: error', error);
        return {type: 'error'};
    }
};

const androidHandleOauth2Login = async (provider: 'apple' | 'google') : Promise<HandleOauth2LoginResult> => {
    if (provider === 'apple') {
        const state = JSON.stringify({
            provider: 'apple',
            client_redirect_back_uri: AppRedirect,
            redirectUri: AppleServerRedirectUri,
            clientId: AppleWebClientId,
            random: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        });
        const authRequest = new AuthRequest({
            clientId: AppleWebClientId,
            redirectUri: AppleServerRedirectUri,
            scopes: ['email', 'name'],
            responseType: ResponseType.Code,
            // codeChallengeMethod: CodeChallengeMethod.S256,
            usePKCE: false,
            state,
            extraParams: {
                response_mode: 'form_post',
            }
        });
        const result = await authRequest.promptAsync({
            authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
        });

        console.log("handleAppleLogin: result", authRequest.url);
        // Apple login use redirect flow thus no handleCodeFlow here
        console.log('handleAppleLogin: result', result);

        return {type: 'pending'};
    } else if (provider === 'google') {
        const result = await signInWithGoogle({
            serverClientId: AndroidGID,
            nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            autoSelectEnabled: true,
        });

        DevLogger.log('handleGoogleLogin: result', result);

        if (result.type === 'success') {
            handleCodeFlow({
                provider: 'google',
                code: result.params.code, // result.params.idToken
                idToken: result.params.idToken,
                clientId: AndroidGID,
            });
        }
        return result;
    }
    throw new Error('Invalid provider');
};


const handleOauth2Login = async (provider: 'apple' | 'google') : Promise<HandleOauth2LoginResult> => {
    if (Platform.OS === 'ios') {
        return await iosHandleOauth2Login(provider);
    } else if (Platform.OS === 'android') {
        return await androidHandleOauth2Login(provider);
    }
    throw new Error('Invalid platform');
};

export default handleOauth2Login;
