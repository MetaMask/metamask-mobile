import { PREFIXES, ACTIONS } from '../../../constants/deeplinks';

// to get from environment variable
export const AuthServerUrl = process.env.AUTH_SERVER_URL;
export const AppRedirectUri = `${PREFIXES.METAMASK}${ACTIONS.OAUTH2_REDIRECT}`;

// bundle id
export const IosAppleClientId = process.env.IOS_APPLE_CLIENT_ID;

export const IosGID = process.env.IOS_GOOGLE_CLIENT_ID;
export const IosGoogleRedirectUri = process.env.IOS_GOOGLE_REDIRECT_URI;

export const AndroidGoogleWebGID = process.env.ANDROID_WEB_GOOGLE_CLIENT_ID;
export const AppleWebClientId = process.env.ANDROID_WEB_APPLE_CLIENT_ID;

export const AppleServerRedirectUri = `${AuthServerUrl}/api/v1/oauth/callback`;
