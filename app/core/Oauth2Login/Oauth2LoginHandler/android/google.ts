import { jwtDecode } from "jwt-decode";
import Logger from "../../../../util/Logger";
import { LoginHandler, LoginHandlerIdTokenResult, AuthConnection, OAuthUserInfo } from "../../Oauth2loginInterface";
import { signInWithGoogle } from "react-native-google-acm";

export class AndroidGoogleLoginHandler implements LoginHandler {
    readonly #scope = ['email', 'profile'];

    protected clientId: string;

    get authConnection() {
        return AuthConnection.Google;
    }
    
    get scope() {
        return this.#scope;
    }

    get authServerPath() {
        return 'api/v1/oauth/id_token';
    }
    
    constructor(params: {clientId: string}) {
        this.clientId = params.clientId
    }

    async login(): Promise<LoginHandlerIdTokenResult | undefined> {
        const result = await signInWithGoogle({
            serverClientId: this.clientId,
            nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            autoSelectEnabled: true,
        });
        Logger.log('handleGoogleLogin: result', result);
    
        if (result.type === 'google-signin') {
            return {
                authConnection: this.authConnection,
                idToken: result.idToken,
                clientId: this.clientId,
            };
        }
        return undefined;
    };
}
