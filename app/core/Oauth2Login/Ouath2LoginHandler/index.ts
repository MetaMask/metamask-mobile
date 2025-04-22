import { Platform } from 'react-native';
 import { ByoaResponse, HandleFlowParams, LoginHandlerCodeResult, LoginHandlerIdTokenResult, OAuthProvider } from '../Oauth2loginInterface';
import { IosGoogleLoginHandler } from './ios/google';
import { IosAppleLoginHandler } from './ios/apple';
import { AndroidGoogleLoginHandler } from './android/google';
import { AndroidAppleLoginHandler } from './android/apple';
import { ACTIONS, PREFIXES } from '../../../constants/deeplinks';

// to be get from enviroment variable
export const ByoaServerUrl = 'https://api-develop-torus-byoa.web3auth.io';
export const AppRedirectUri = `${PREFIXES.METAMASK}${ACTIONS.OAUTH2_REDIRECT}`;

export const IosGID = '882363291751-nbbp9n0o307cfil1lup766g1s99k0932.apps.googleusercontent.com';
export const IosGoogleRedirectUri = 'com.googleusercontent.apps.882363291751-nbbp9n0o307cfil1lup766g1s99k0932:/oauth2redirect/google';

export const AndroidGoogleWebGID = '882363291751-2a37cchrq9oc1lfj1p419otvahnbhguv.apps.googleusercontent.com';
export const AppleServerRedirectUri = `${ByoaServerUrl}/api/v1/oauth/callback`;
export const AppleWebClientId = 'com.web3auth.appleloginextension';


export function createLoginHandler(
    platformOS: Platform['OS'],
    provider: OAuthProvider,
) {
    switch (platformOS) {
        case 'ios' :
            switch (provider) {
                case OAuthProvider.Google:
                    return new IosGoogleLoginHandler({
                        clientId: IosGID,
                        redirecUri: IosGoogleRedirectUri
                    });
                case OAuthProvider.Apple:
                    return new IosAppleLoginHandler();
                default:
                    throw new Error('Invalid provider');
            }
        case 'android':
            switch (provider) {
                case OAuthProvider.Google:
                    return new AndroidGoogleLoginHandler({
                        clientId: AndroidGoogleWebGID
                    });
                case OAuthProvider.Apple:
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

export async function getByoaTokens (params : HandleFlowParams , byoaServerUrl?: string) : Promise<ByoaResponse> {
    const {provider, clientId, redirectUri, codeVerifier, web3AuthNetwork} = params;
    const {code} = params as LoginHandlerCodeResult;
    const {idToken} = params as LoginHandlerIdTokenResult;

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

    const res = await fetch(`${byoaServerUrl}/${pathname}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const data = await res.json() as ByoaResponse;

    return data;
}
