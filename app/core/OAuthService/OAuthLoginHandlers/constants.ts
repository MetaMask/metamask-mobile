import { ACTIONS, PREFIXES } from '../../../constants/deeplinks';
import { isQa } from '../../../util/test/utils';
import AppConstants from '../../AppConstants';
import { AuthConnection } from '../OAuthInterface';
import { OAUTH_CONFIG } from './config';

export const SEEDLESS_ONBOARDING_ENABLED =
  process.env.SEEDLESS_ONBOARDING_ENABLED === 'true';

/**
 * Mapping of old Build Type to new BuildType formatting for oauth config
 * Main -> main_prod
 * QA -> main_uat
 * Debug -> main_dev
 * flask -> flask_prod
 * flask QA -> flask_uat
 * flask Debug -> flask_dev
 *
 * new build types
 * main_beta -> main_prod
 * main_rc -> main_prod
 *
 * @param buildType - The build type to map
 * @param isDev - Whether the build is a development build
 * @returns The mapped build type
 */
const buildTypeMapping = (buildType: string, isDev: boolean) => {
  // use development config for now
  if (process.env.DEV_OAUTH_CONFIG === 'true' && isDev) {
    return 'development';
  }

  switch (buildType) {
    case 'qa':
      return 'main_uat';
    case 'main':
      return isQa ? 'main_uat' : isDev ? 'main_dev' : 'main_prod';
    case 'flask':
      return isQa ? 'flask_uat' : isDev ? 'flask_dev' : 'flask_prod';
    default:
      return 'development';
  }
};

const BuildType = buildTypeMapping(
  AppConstants.METAMASK_BUILD_TYPE || 'main',
  AppConstants.IS_DEV,
);
const CURRENT_OAUTH_CONFIG = OAUTH_CONFIG[BuildType];

export const web3AuthNetwork = CURRENT_OAUTH_CONFIG.WEB3AUTH_NETWORK;
export const AuthServerUrl = CURRENT_OAUTH_CONFIG.AUTH_SERVER_URL;

export const IosGID = process.env.IOS_GOOGLE_CLIENT_ID;
export const IosGoogleRedirectUri = process.env.IOS_GOOGLE_REDIRECT_URI;
export const AndroidGoogleWebGID = process.env.ANDROID_GOOGLE_SERVER_CLIENT_ID;
export const AppleWebClientId = process.env.ANDROID_APPLE_CLIENT_ID;

// export const AppRedirectUri = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.OAUTH_REDIRECT}`;
// use app deeplink for now, wait for applink to be updated
export const AppRedirectUri = `${PREFIXES.METAMASK}${ACTIONS.OAUTH_REDIRECT}`;
export const AppleServerRedirectUri = `${CURRENT_OAUTH_CONFIG.AUTH_SERVER_URL}/api/v1/oauth/callback`;

export enum SupportedPlatforms {
  Android = 'android',
  IOS = 'ios',
}

export const AuthConnectionConfig: Record<
  SupportedPlatforms,
  Record<
    AuthConnection,
    {
      authConnectionId: string;
      groupedAuthConnectionId?: string;
    }
  >
> = {
  [SupportedPlatforms.Android]: {
    [AuthConnection.Google]: {
      authConnectionId: CURRENT_OAUTH_CONFIG.ANDROID_GOOGLE_AUTH_CONNECTION_ID,
      groupedAuthConnectionId:
        CURRENT_OAUTH_CONFIG.GOOGLE_GROUPED_AUTH_CONNECTION_ID,
    },
    [AuthConnection.Apple]: {
      authConnectionId: CURRENT_OAUTH_CONFIG.ANDROID_APPLE_AUTH_CONNECTION_ID,
      groupedAuthConnectionId:
        CURRENT_OAUTH_CONFIG.APPLE_GROUPED_AUTH_CONNECTION_ID,
    },
  },
  [SupportedPlatforms.IOS]: {
    [AuthConnection.Google]: {
      authConnectionId: CURRENT_OAUTH_CONFIG.IOS_GOOGLE_AUTH_CONNECTION_ID,
      groupedAuthConnectionId:
        CURRENT_OAUTH_CONFIG.GOOGLE_GROUPED_AUTH_CONNECTION_ID,
    },
    [AuthConnection.Apple]: {
      authConnectionId: CURRENT_OAUTH_CONFIG.IOS_APPLE_AUTH_CONNECTION_ID,
      groupedAuthConnectionId:
        CURRENT_OAUTH_CONFIG.APPLE_GROUPED_AUTH_CONNECTION_ID,
    },
  },
};
