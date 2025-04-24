import { PREFIXES, ACTIONS } from '../../../constants/deeplinks';

// to get from environment variable
export const AuthServerUrl = process.env.AuthServerUrl;
export const AppRedirectUri = `${PREFIXES.METAMASK}${ACTIONS.OAUTH2_REDIRECT}`;

export const IosGID = process.env.IosGID;
export const IosGoogleRedirectUri = process.env.IosGoogleRedirectUri;

export const AndroidGoogleWebGID = process.env.AndroidGoogleWebGID;
export const AppleServerRedirectUri = `${AuthServerUrl}/api/v1/oauth/callback`;
export const AppleWebClientId = process.env.AppleWebClientId;
export const IosAppleClientId = process.env.IosAppleClientId;
