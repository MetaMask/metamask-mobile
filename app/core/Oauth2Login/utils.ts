import { signInAsync, AppleAuthenticationScope } from 'expo-apple-authentication';
import { Platform } from 'react-native';
import {
    AuthRequest,
    ResponseType,
    CodeChallengeMethod
  } from 'expo-auth-session';
import {signInWithGoogle} from 'react-native-google-acm';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { UserAction, UserActionType } from '../../actions/user';
import { Dispatch } from 'redux';
import { ACTIONS, PREFIXES } from '../../constants/deeplinks';

const AppRedirect = `${PREFIXES.METAMASK}${ACTIONS.OAUTH2_REDIRECT}`;

const IosGID = '882363291751-nbbp9n0o307cfil1lup766g1s99k0932.apps.googleusercontent.com';
const IosGoogleRedirectUri = 'com.googleusercontent.apps.882363291751-nbbp9n0o307cfil1lup766g1s99k0932:/oauth2redirect/google';

const AndroidWebGID = '882363291751-2a37cchrq9oc1lfj1p419otvahnbhguv.apps.googleusercontent.com';
const AndroidGID = AndroidWebGID;
const AndroidAppleRedirectUri = 'https://simple-auth-server-jade.vercel.app/apple/redirect';



interface HandleFlowParams {
    provider: 'apple' | 'google';
    code: string | null;
    idToken: string | null;
    accessToken: string | null;
}

export const handleCodeFlow = async (data : HandleFlowParams, dispatch: Dispatch<UserAction>) => {
    console.log(data);

    if (data.code) {
        // exchange code for AuthToken from byoa server
    }
    else if (data.idToken) {
        // exchange idToken for AuthToken from byoa server
    }
    else if (data.accessToken) {
        // exchange accessToken for AuthToken from byoa server
    }
    else {
        throw new Error('No code, idToken, or accessToken');
    }

    // const result = seedlessOnboardingController.authenticate(byoaAuthToken)
    // const existingUser = result.existingUser;

    console.log('handleCodeFlow: dispatching OAUTH2_LOGIN_SUCCESS');
    // dispatch Action for login success
    dispatch({
        type: UserActionType.OAUTH2_LOGIN_SUCCESS,
        payload: {
            existingUser: false,
        },
    });
};


const handleAppleLogin = async (dispatch: Dispatch<UserAction>) => {
    if (Platform.OS === 'ios') {
        try {
            const credential = await signInAsync({
                requestedScopes: [
                    AppleAuthenticationScope.FULL_NAME,
                    AppleAuthenticationScope.EMAIL,
                ],
            });

            handleCodeFlow({
                    provider: 'apple',
                    code: credential.authorizationCode,
                    idToken: null,
                    accessToken: null,
            }, dispatch);

            return credential.authorizationCode ? 'success' : 'error';
        } catch (error) {
            DevLogger.log('handleAppleLogin: error', error);

            dispatch({
                type: UserActionType.OAUTH2_LOGIN_ERROR,
                payload: {
                    error: 'Apple login failed',
                },
            });
            return 'error';
        }
    }
    else if (Platform.OS === 'android') {
        const state = JSON.stringify({
            provider: 'apple',
            redirectUri: AppRedirect,
            random: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        });
        const authRequest = new AuthRequest({
            clientId: 'com.web3auth.appleloginextension',
            redirectUri: AndroidAppleRedirectUri,
            scopes: ['email', 'name'],
            responseType: ResponseType.Code,
            codeChallengeMethod: CodeChallengeMethod.S256,
            state,
            usePKCE: true,
            extraParams: {
                response_mode: 'form_post',
            }
        });
        const result = await authRequest.promptAsync({
            authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
        }).catch((error: any) => {
            DevLogger.log('handleAppleLogin: error', error);
            return {type: 'error'};
        });

        // Apple login use redirect flow thus no handleCodeFlow here
        DevLogger.log('handleAppleLogin: result', result);
        dispatch({
            type: UserActionType.OAUTH2_LOGIN_COMPLETE,
        });
        return result.type;
    }
    throw new Error('Apple login is not supported on this platform');
};


const handleGoogleLogin = async(dispatch: Dispatch<UserAction>) => {
    if (Platform.OS === 'ios') {
        const authRequest = new AuthRequest({
            clientId: IosGID,
            redirectUri: IosGoogleRedirectUri,
            scopes: ['email', 'profile'],
            responseType: ResponseType.Code,
            usePKCE: true,

        });
        const result = await authRequest.promptAsync({
            authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        });

        DevLogger.log('handleGoogleLogin: result', result);

        if (result.type === 'success') {
            handleCodeFlow({
                provider: 'google',
                code: result.params.code, // result.params.idToken
                idToken: null,
                accessToken: null,
            }, dispatch);
        } else if (result.type === 'error') {
            dispatch({
                type: UserActionType.OAUTH2_LOGIN_ERROR,
                payload: {
                    error: 'Google login failed',
                },
            });
        } else {
            // dispatch({ type: UserActionType.OAUTH2_LOGIN_COMPLETE });
        }

        return result.type;
    }
    else if (Platform.OS === 'android') {

        const result = await signInWithGoogle({
            serverClientId: AndroidGID,
            nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            autoSelectEnabled: true,
        }).catch((error: any) => {
            DevLogger.log('handleGoogleLogin: error', error);
            return {type: 'error'};
        });

        DevLogger.log('handleGoogleLogin: result', result);

        if (result.type === 'success') {
            handleCodeFlow({
                provider: 'google',
                code: result.params.code, // result.params.idToken
                idToken: null,
                accessToken: null,
            }, dispatch);
        } else if (result.type === 'error') {
            dispatch({
                type: UserActionType.OAUTH2_LOGIN_ERROR,
                payload: {
                    error: result.params.error,
                },
            });
        } else {
            dispatch({ type: UserActionType.OAUTH2_LOGIN_COMPLETE });
        }

        return result.type;
    }

    throw new Error('Google login is not supported on this platform');
};


const handleOauth2Login = (provider: 'apple' | 'google', dispatch: Dispatch<UserAction>) => {
    if (provider === 'apple') {
        return handleAppleLogin(dispatch);
    }
    else if (provider === 'google') {
        return handleGoogleLogin(dispatch);
    }
    throw new Error('Invalid provider');
};


export default handleOauth2Login;
