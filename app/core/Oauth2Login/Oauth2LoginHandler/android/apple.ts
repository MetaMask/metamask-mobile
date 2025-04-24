import { CodeChallengeMethod, ResponseType } from "expo-auth-session";
import { AuthRequest } from "expo-auth-session";
import { AuthConnection, LoginHandler, LoginHandlerCodeResult } from "../../Oauth2loginInterface";

export interface AndroidAppleLoginHandlerParams {
    clientId: string, 
    redirectUri: string, 
    appRedirectUri: string
}

export class AndroidAppleLoginHandler implements LoginHandler {
    public readonly OAUTH_SERVER_URL = 'https://appleid.apple.com/auth/authorize';

    readonly #scope = ['name', 'email'];
    
    protected clientId: string;
    protected redirectUri: string;
    protected appRedirectUri: string;

    get authConnection() {
        return AuthConnection.Apple;
    }
    
    get scope() {
        return this.#scope;
    }

    get authServerPath() {
        return 'api/v1/oauth/id_token';
    }

    constructor(params: AndroidAppleLoginHandlerParams) {
        const {appRedirectUri, redirectUri, clientId} = params;
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        this.appRedirectUri = appRedirectUri;
    }

    async login(): Promise<LoginHandlerCodeResult | undefined> {
        const state = JSON.stringify({
            provider: this.authConnection,
            client_redirect_back_uri: this.appRedirectUri,
            redirectUri: this.redirectUri,
            clientId: this.appRedirectUri,
            random: Math.random().toString(36).substring(2, 15),
        });
        const authRequest = new AuthRequest({
            clientId: this.clientId,
            redirectUri: this.redirectUri,
            scopes: this.#scope,
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
            authorizationEndpoint: this.OAUTH_SERVER_URL,
        });
    
        // create a client auth request instance so that the auth-session can return result on appRedirectUrl
        const authRequestClient = new AuthRequest({
            clientId: this.clientId,
            redirectUri: this.appRedirectUri,
        });
    
        // prompt the auth request using generated auth url instead of the client auth request instance
        const result = await authRequestClient.promptAsync({
            authorizationEndpoint: this.OAUTH_SERVER_URL,
        }, {
            url: authUrl,
        });
        if (result.type === 'success') {
            return {
                authConnection: AuthConnection.Apple,
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
