import { CodeChallengeMethod, ResponseType } from "expo-auth-session";
import { AuthRequest } from "expo-auth-session";
import { OAuthProvider, LoginHandler, LoginHandlerResult } from "../../Oauth2loginInterface";
const AppleAuthorizeEndpoint = 'https://appleid.apple.com/auth/authorize';

export class AndroidAppleLoginHandler implements LoginHandler {
    provider = OAuthProvider.Apple
    clientId: string;
    redirectUri: string;
    appRedirectUri: string;

    constructor(params: {clientId: string, redirectUri: string, appRedirectUri: string}) {
        const {appRedirectUri, redirectUri, clientId} = params;
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        this.appRedirectUri = appRedirectUri;
    }

    async login (): Promise<LoginHandlerResult | undefined> {
        const state = JSON.stringify({
            provider: this.provider,
            client_redirect_back_uri: this.appRedirectUri,
            redirectUri: this.redirectUri,
            clientId: this.appRedirectUri,
            random: Math.random().toString(36).substring(2, 15),
        });
        const authRequest = new AuthRequest({
            clientId: this.clientId,
            redirectUri: this.redirectUri,
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
            clientId: this.clientId,
            redirectUri: this.appRedirectUri,
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
                provider: OAuthProvider.Apple,
                code: result.params.code,
                clientId: this.clientId,
                redirectUri: this.redirectUri,
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
}