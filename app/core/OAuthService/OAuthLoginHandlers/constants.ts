import { ACTIONS, PROTOCOLS } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';
import { AuthConnection } from '../OAuthInterface';
import { OAUTH_CONFIG } from './config';

// const BuildType = AppConstants.IS_DEV ? 'development' : AppConstants.METAMASK_BUILD_TYPE || 'development';
// use development config for now
const BuildType = 'development';
const CURRENT_OAUTH_CONFIG = OAUTH_CONFIG[BuildType];

export const web3AuthNetwork = CURRENT_OAUTH_CONFIG.WEB3AUTH_NETWORK;
export const AuthServerUrl = CURRENT_OAUTH_CONFIG.AUTH_SERVER_URL;
export const IosGID = CURRENT_OAUTH_CONFIG.IOS_GOOGLE_CLIENT_ID;
export const IosGoogleRedirectUri = CURRENT_OAUTH_CONFIG.IOS_GOOGLE_REDIRECT_URI;
export const IosAppleClientId = CURRENT_OAUTH_CONFIG.IOS_APPLE_CLIENT_ID;
export const AndroidGoogleWebGID =
  CURRENT_OAUTH_CONFIG.ANDROID_GOOGLE_SERVER_CLIENT_ID;
export const AppleWebClientId = CURRENT_OAUTH_CONFIG.ANDROID_APPLE_CLIENT_ID;

export const AppRedirectUri = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.OAUTH_REDIRECT}`;
export const AppleServerRedirectUri = `${CURRENT_OAUTH_CONFIG.AUTH_SERVER_URL}/api/v1/oauth/callback`;

export enum SupportedPlatforms {
  Android = 'android',
  IOS = 'ios',
}

export const AuthConnectionConfig: Record<SupportedPlatforms, Record<AuthConnection, {
  authConnectionId: string;
  groupedAuthConnectionId?: string;
}>> = {
  [SupportedPlatforms.Android]: {
    [AuthConnection.Google]: {
      authConnectionId:
        CURRENT_OAUTH_CONFIG.ANDROID_GOOGLE_AUTH_CONNECTION_ID,
      groupedAuthConnectionId:
        CURRENT_OAUTH_CONFIG.GOOGLE_GROUPED_AUTH_CONNECTION_ID,
    },
    [AuthConnection.Apple]: {
      authConnectionId:
        CURRENT_OAUTH_CONFIG.ANDROID_APPLE_AUTH_CONNECTION_ID,
      groupedAuthConnectionId:
        CURRENT_OAUTH_CONFIG.APPLE_GROUPED_AUTH_CONNECTION_ID,
    },
  },
  [SupportedPlatforms.IOS]: {
    [AuthConnection.Google]: {
      authConnectionId:
        CURRENT_OAUTH_CONFIG.IOS_GOOGLE_AUTH_CONNECTION_ID,
      groupedAuthConnectionId:
        CURRENT_OAUTH_CONFIG.GOOGLE_GROUPED_AUTH_CONNECTION_ID,
    },
    [AuthConnection.Apple]: {
      authConnectionId:
        CURRENT_OAUTH_CONFIG.IOS_APPLE_AUTH_CONNECTION_ID,
      groupedAuthConnectionId:
        CURRENT_OAUTH_CONFIG.APPLE_GROUPED_AUTH_CONNECTION_ID,
    },
  },
};
