import { HandleFlowParams } from "../Oauth2loginInterface";
import { LoginMode } from "../Oauth2loginInterface";
import { AuthRequest, CodeChallengeMethod, ResponseType } from "expo-auth-session";
import { IosGoogleRedirectUri } from "../Oauth2loginInterface";
import { IosGID } from "../Oauth2loginInterface";

export const handleIosGoogleLogin = async (): Promise<HandleFlowParams | undefined> => {
    const state = JSON.stringify({
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
        return {
            provider: 'google',
            code: result.params.code, // result.params.idToken
            clientId: IosGID,
            redirectUri: IosGoogleRedirectUri,
            codeVerifier: authRequest.codeVerifier,
        };
    }
    if (result.type === 'error') {
        if (result.error) {
            throw result.error;
        }
        throw new Error('handleIosGoogleLogin: Unknown error');
    }
    return undefined;
};
