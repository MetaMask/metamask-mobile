import { LoginHandlerIdTokenResult, AuthConnection } from "../../Oauth2loginInterface";
import { signInAsync } from "expo-apple-authentication";
import { AppleAuthenticationScope } from "expo-apple-authentication";
import { BaseLoginHandler } from "../baseHandler";

export class IosAppleLoginHandler extends BaseLoginHandler {
    readonly #scope = [AppleAuthenticationScope.FULL_NAME, AppleAuthenticationScope.EMAIL];
    
    protected clientId: string;

    get authConnection() {
        return AuthConnection.Apple;
    }
    
    get scope() {
        return this.#scope.map(scope => scope.toString());
    }

    get authServerPath() {
        return 'api/v1/oauth/id_token';
    }

    constructor(params: {clientId: string}) {
        super();
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
