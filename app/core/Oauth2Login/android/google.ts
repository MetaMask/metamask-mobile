import Logger from "../../../util/Logger";
import { AndroidGoogleWebGID } from "../Oauth2loginInterface";
import { HandleFlowParams } from "../Oauth2loginInterface";
import { signInWithGoogle } from "react-native-google-acm";

export const handleAndroidGoogleLogin = async (): Promise<HandleFlowParams | undefined> => {
    const result = await signInWithGoogle({
        serverClientId: AndroidGoogleWebGID,
        nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        autoSelectEnabled: true,
    });
    Logger.log('handleGoogleLogin: result', result);

    if (result.type === 'google-signin') {
        return {
            provider: 'google',
            idToken: result.idToken,
            clientId: AndroidGoogleWebGID,
        };
    }
    return undefined;
};