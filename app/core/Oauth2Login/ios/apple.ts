import { HandleFlowParams } from "../Oauth2loginInterface";
import { signInAsync } from "expo-apple-authentication";
import { AppleAuthenticationScope } from "expo-apple-authentication";
import { IosGID } from "../Oauth2loginInterface";


export const handleIosAppleLogin = async (): Promise<HandleFlowParams | undefined> => {
    const credential = await signInAsync({
        requestedScopes: [
            AppleAuthenticationScope.FULL_NAME,
            AppleAuthenticationScope.EMAIL,
        ],
    });
    if (credential.identityToken) {
        return {
            provider: 'apple',
            idToken: credential.identityToken,
            clientId: IosGID,
        };
    }
    return undefined;
};
