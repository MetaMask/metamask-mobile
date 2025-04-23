import { LoginHandler, LoginHandlerCodeResult, AuthConnection } from "../../Oauth2loginInterface";
import { AuthRequest, CodeChallengeMethod, ResponseType } from "expo-auth-session";

export type IosGoogleLoginHandlerParams = {
    clientId : string,
    redirecUri: string,
}

export class IosGoogleLoginHandler implements LoginHandler {
    public readonly OAUTH_SERVER_URL = 'https://appleid.apple.com/auth/authorize';

    readonly #scope = ['email', 'profile'];
    
    protected clientId: string;
    protected redirectUri: string;

    get authConnection() {
        return AuthConnection.Google;
    }
    
    get scope() {
        return this.#scope;
    }
    constructor( params : IosGoogleLoginHandlerParams){
        this.clientId = params.clientId;
        this.redirectUri = params.redirecUri;
    }

    async login () : Promise<LoginHandlerCodeResult | undefined> {
        const state = JSON.stringify({
            random: Math.random().toString(36).substring(2, 15),
        });
        const authRequest = new AuthRequest({
            clientId: this.clientId,
            redirectUri: this.redirectUri,
            scopes: this.#scope,
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
                authConnection: this.authConnection,
                code: result.params.code, // result.params.idToken
                clientId: this.clientId,
                redirectUri: this.redirectUri,
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
}
