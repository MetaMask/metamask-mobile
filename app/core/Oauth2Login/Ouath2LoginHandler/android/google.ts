import Logger from "../../../../util/Logger";
import { LoginHandlerIdTokenResult, OAuthProvider } from "../../Oauth2loginInterface";
import { signInWithGoogle } from "react-native-google-acm";

export class AndroidGoogleLoginHandler {
    provider = OAuthProvider.Google
    clientId

    constructor(params: {clientId: string}) {
        this.clientId = params.clientId
    }
    async login  (): Promise<LoginHandlerIdTokenResult | undefined> {
        const result = await signInWithGoogle({
            serverClientId: this.clientId,
            nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            autoSelectEnabled: true,
        });
        Logger.log('handleGoogleLogin: result', result);
    
        if (result.type === 'google-signin') {
            return {
                provider: this.provider,
                idToken: result.idToken,
                clientId: this.clientId,
            };
        }
        return undefined;
    };
}