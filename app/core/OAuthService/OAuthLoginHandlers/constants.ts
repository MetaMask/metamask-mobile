import { ACTIONS, PREFIXES, PROTOCOLS } from '../../../constants/deeplinks';
import Device from '../../../util/device';
import ReduxService from '../../redux';
import { isQa } from '../../../util/test/utils';
import AppConstants from '../../AppConstants';
import { AuthConnection } from '../OAuthInterface';
import { OAUTH_CONFIG } from './config';
import {
  DEFAULT_LEGACY_IOS_GOOGLE_CONFIG_ENABLED,
  selectLegacyIosGoogleConfigEnabled,
} from '../../../selectors/featureFlagController/legacyIosGoogleConfig';

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

/** UAT QA mock token URL — optional ping when `E2E_MOCK_OAUTH` + `E2E_BYOA_AUTH_SECRET` (BrowserStack perf). */
export const E2E_QA_MOCK_OAUTH_TOKEN_URL =
  'https://auth-service.uat-api.cx.metamask.io/api/v1/qa/mock/oauth/token';

export const AUTH_SERVER_MARKETING_OPT_IN_PATH =
  '/api/v1/oauth/marketing_opt_in_status';

export const IosGID = process.env.IOS_GOOGLE_CLIENT_ID;
export const IosGoogleRedirectUri = process.env.IOS_GOOGLE_REDIRECT_URI;
export const GoogleWebGID = process.env.ANDROID_GOOGLE_SERVER_CLIENT_ID;
export const AppleWebClientId = process.env.ANDROID_APPLE_CLIENT_ID;

// Use universal link for OAuth redirect
export const GoogleRedirectUri = `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.OAUTH_REDIRECT}`;
export const AppRedirectUri = `${PREFIXES.METAMASK}${ACTIONS.OAUTH_REDIRECT}`;
export const AppleServerRedirectUri = `${CURRENT_OAUTH_CONFIG.AUTH_SERVER_URL}/api/v1/oauth/callback`;

export const shouldUseLegacyIosGoogleConfig = () => {
  if (!Device.isIos()) {
    return false;
  }

  try {
    return selectLegacyIosGoogleConfigEnabled(ReduxService.store.getState());
  } catch {
    return DEFAULT_LEGACY_IOS_GOOGLE_CONFIG_ENABLED;
  }
};

export const getIosGoogleConfig = () => {
  if (
    shouldUseLegacyIosGoogleConfig() ||
    (Device.isIos() && Device.comparePlatformVersionTo('17.4') < 0)
  ) {
    if (!IosGoogleRedirectUri || !IosGID) {
      throw new Error('IosGoogleConfig is not set');
    }
    return {
      clientId: IosGID,
      redirectUri: IosGoogleRedirectUri,
    };
  }

  if (!GoogleWebGID) {
    throw new Error('GoogleWebGID is not set');
  }
  return {
    clientId: GoogleWebGID,
    redirectUri: GoogleRedirectUri,
  };
};

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
