import { LoginHandler, LoginHandlerIdTokenResult, OAuthProvider } from "../../Oauth2loginInterface";
import { signInAsync } from "expo-apple-authentication";
import { AppleAuthenticationScope } from "expo-apple-authentication";

export class IosAppleLoginHandler implements LoginHandler {
    provider = OAuthProvider.Apple
    clientId : string;

    constructor(params: {clientId: string}) {
        this.clientId = params.clientId
    }

    async login (): Promise<LoginHandlerIdTokenResult | undefined> {
        const credential = await signInAsync({
            requestedScopes: [
                AppleAuthenticationScope.FULL_NAME,
                AppleAuthenticationScope.EMAIL,
            ],
        });
        if (credential.identityToken) {
            return {
                provider: this.provider,
                idToken: credential.identityToken,
                clientId: this.clientId,
            };
        }
        return undefined;
    };
}