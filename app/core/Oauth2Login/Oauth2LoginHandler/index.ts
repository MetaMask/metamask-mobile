import { Platform } from 'react-native';
import { AuthResponse, HandleFlowParams, LoginHandlerCodeResult, LoginHandlerIdTokenResult, AuthConnection } from '../Oauth2loginInterface';
import { IosGoogleLoginHandler } from './ios/google';
import { IosAppleLoginHandler } from './ios/apple';
import { AndroidGoogleLoginHandler } from './android/google';
import { AndroidAppleLoginHandler } from './android/apple';
import { ACTIONS, PREFIXES } from '../../../constants/deeplinks';

// to be get from enviroment variable
export const AuthServerUrl = process.env.AuthServerUrl;
export const AppRedirectUri = `${PREFIXES.METAMASK}${ACTIONS.OAUTH2_REDIRECT}`;

export const IosGID = process.env.IosGID;
export const IosGoogleRedirectUri = process.env.IosGoogleRedirectUri;

export const AndroidGoogleWebGID = process.env.AndroidGoogleWebGID;
export const AppleServerRedirectUri = `${AuthServerUrl}/api/v1/oauth/callback`;
export const AppleWebClientId = process.env.AppleWebClientId;
export const IosAppleClientId = process.env.IosAppleClientId;


export function createLoginHandler(
    platformOS: Platform['OS'],
    provider: AuthConnection,
) {
    if (!AuthServerUrl || !AppRedirectUri || !IosGID || !IosGoogleRedirectUri || !AndroidGoogleWebGID || !AppleWebClientId || !IosAppleClientId) {
        throw new Error('Missing environment variables');
    }
    switch (platformOS) {
        case 'ios' :
            switch (provider) {
                case AuthConnection.Google:
                    return new IosGoogleLoginHandler({
                        clientId: IosGID,
                        redirecUri: IosGoogleRedirectUri
                    });
                case AuthConnection.Apple:
                    return new IosAppleLoginHandler({clientId: IosAppleClientId});
                default:
                    throw new Error('Invalid provider');
            }
        case 'android':
            switch (provider) {
                case AuthConnection.Google:
                    return new AndroidGoogleLoginHandler({
                        clientId: AndroidGoogleWebGID
                    });
                case AuthConnection.Apple:
                    return new AndroidAppleLoginHandler({
                        clientId: AppleWebClientId,
                        redirectUri: AppleServerRedirectUri,
                        appRedirectUri: AppRedirectUri
                    });
                default:
                    throw new Error('Invalid provider');
            }
        default:
        throw new Error('Unsupported Platform');
    }
}

export async function getAuthTokens (params : HandleFlowParams, pathname: string, authServerUrl: string) : Promise<AuthResponse> {
    const {authConnection, clientId, redirectUri, codeVerifier, web3AuthNetwork} = params;
    const {code} = params as LoginHandlerCodeResult;
    const {idToken} = params as LoginHandlerIdTokenResult;

    const body = {
        code,
        id_token: idToken,
        client_id: clientId,
        login_provider: authConnection,
        network: web3AuthNetwork,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
    };

    const res = await fetch(`${authServerUrl}/${pathname}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (res.status === 200 ) {
        const data = await res.json() as AuthResponse;
        return data;
    }

    throw new Error(`AuthServer Error : ${await res.text()}`);
}
