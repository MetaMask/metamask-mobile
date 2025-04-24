import { LoginHandler, LoginHandlerIdTokenResult, AuthConnection } from "../../Oauth2loginInterface";
import { signInAsync } from "expo-apple-authentication";
import { AppleAuthenticationScope } from "expo-apple-authentication";

export class IosAppleLoginHandler implements LoginHandler {
    readonly #scope = [AppleAuthenticationScope.FULL_NAME, AppleAuthenticationScope.EMAIL];
    
    protected clientId: string;

    get authConnection() {
        return AuthConnection.Apple;
    }
    
    get scope() {
        return this.#scope;
    }

    constructor(params: {clientId: string}) {
        this.clientId = params.clientId
    }

    async login(): Promise<LoginHandlerIdTokenResult | undefined> {
        const credential = await signInAsync({
            requestedScopes: this.#scope,
        });
    
        if (credential.identityToken) {
            return {
                authConnection: this.authConnection,
                idToken: credential.identityToken,
                clientId: this.clientId,
            };
        }
        return undefined;
    };
}
