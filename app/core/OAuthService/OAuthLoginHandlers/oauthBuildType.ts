import AppConstants from '../../AppConstants';
import { isQa } from '../../../util/test/utils';
import { BUILD_TYPE, OAUTH_CONFIG } from './config';

function oauthEnvironmentVariant(
  isQaChannel: boolean,
  isDev: boolean,
  variants: {
    uat: BUILD_TYPE;
    dev: BUILD_TYPE;
    prod: BUILD_TYPE;
  },
): BUILD_TYPE {
  if (isQaChannel) {
    return variants.uat;
  }
  if (isDev) {
    return variants.dev;
  }
  return variants.prod;
}

/**
 * Maps MetaMask build type + dev/QA flags to OAuth config keys.
 * @param buildType - e.g. main, qa, flask
 * @param isDev - development build
 * @param isQaChannel - QA / e2e / exp channel
 */
export function buildTypeMapping(
  buildType: string,
  isDev: boolean,
  isQaChannel: boolean,
): BUILD_TYPE {
  if (process.env.DEV_OAUTH_CONFIG === 'true' && isDev) {
    return BUILD_TYPE.development;
  }

  switch (buildType) {
    case 'qa':
      return BUILD_TYPE.main_uat;
    case 'main':
      return oauthEnvironmentVariant(isQaChannel, isDev, {
        uat: BUILD_TYPE.main_uat,
        dev: BUILD_TYPE.main_dev,
        prod: BUILD_TYPE.main_prod,
      });
    case 'flask':
      return oauthEnvironmentVariant(isQaChannel, isDev, {
        uat: BUILD_TYPE.flask_uat,
        dev: BUILD_TYPE.flask_dev,
        prod: BUILD_TYPE.flask_prod,
      });
    default:
      return BUILD_TYPE.development;
  }
}

/**
 * Resolves which {@link OAUTH_CONFIG} entry applies (env override or build mapping).
 */
export function resolveOAuthConfigKey(): keyof typeof OAUTH_CONFIG {
  const fromEnv = process.env.OAUTH_BUILD_TYPE;
  if (
    typeof fromEnv === 'string' &&
    fromEnv.length > 0 &&
    fromEnv in OAUTH_CONFIG
  ) {
    return fromEnv as keyof typeof OAUTH_CONFIG;
  }

  return buildTypeMapping(
    AppConstants.METAMASK_BUILD_TYPE || 'main',
    AppConstants.IS_DEV,
    isQa,
  );
}
