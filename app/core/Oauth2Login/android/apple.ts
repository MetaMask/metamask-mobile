import { CodeChallengeMethod, ResponseType } from "expo-auth-session";
import { AuthRequest } from "expo-auth-session";
import { AppRedirectUri, AppleServerRedirectUri, AppleWebClientId, HandleFlowParams, LoginMode } from "../Oauth2loginInterface";



const AppleAuthorizeEndpoint = 'https://appleid.apple.com/auth/authorize';

export const handleAndroidAppleLogin = async (): Promise<HandleFlowParams | undefined> => {
    const state = JSON.stringify({
        provider: 'apple',
        client_redirect_back_uri: AppRedirectUri,
        redirectUri: AppleServerRedirectUri,
        clientId: AppleWebClientId,
        random: Math.random().toString(36).substring(2, 15),
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
    // generate the auth url
    const authUrl = await authRequest.makeAuthUrlAsync({
        authorizationEndpoint: AppleAuthorizeEndpoint,
    });

    // create a dummy auth request so that the auth-session can return result on appRedirectUrl
    const authRequestDummy = new AuthRequest({
        clientId: AppleWebClientId,
        redirectUri: AppRedirectUri,
        scopes: ['email', 'name'],
        responseType: ResponseType.Code,
        codeChallengeMethod: CodeChallengeMethod.S256,
        usePKCE: false,
        state,
        extraParams: {
            response_mode: 'form_post',
        }
    });

    // prompt the auth request using generated auth url instead of the dummy auth request
    const result = await authRequestDummy.promptAsync({
        authorizationEndpoint: AppleAuthorizeEndpoint,
    }, {
        url: authUrl,
    });
    if (result.type === 'success') {
        return {
            provider: 'apple',
            code: result.params.code,
            clientId: AppleWebClientId,
            redirectUri: AppleServerRedirectUri,
            codeVerifier: authRequest.codeVerifier,
        };
    }
    if (result.type === 'error') {
        if (result.error) {
            throw result.error;
        }
        throw new Error('handleAndroidAppleLogin: Unknown error');
    }
    return undefined;
};
