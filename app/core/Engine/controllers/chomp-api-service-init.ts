import {
  ChompApiService,
  type ChompApiServiceMessenger,
} from '@metamask/chomp-api-service';
import type { MessengerClientInitFunction } from '../types';
import type { ChompApiServiceInitMessenger } from '../messengers/chomp-api-service-messenger';
import { parseChompApiConfig } from '../../../selectors/featureFlagController/chompApi';
import Logger from '../../../util/Logger';
import { devApiEnv, type DevApiEnv } from '../../devApiEnv';

const LOG_PREFIX = '[ChompApiServiceInit]';

// Fallback used only when the remote feature flag has not hydrated yet (e.g.
// first launch, offline). Points at dev so unconfigured builds will fail fast
// against a non-prod backend.
const FALLBACK_CHOMP_API_URL = 'https://chomp.dev-api.cx.metamask.io';

// Known chomp base URLs per env. When `MM_DEV_API_ENV` is set to one of these,
// the env wins over the remote feature flag — the JWT will be minted for that
// env by AuthenticationController, and a prod chomp endpoint would 401 it.
const CHOMP_URL_BY_DEV_API_ENV: Partial<Record<DevApiEnv, string>> = {
  dev: 'https://chomp.dev-api.cx.metamask.io',
};

/**
 * Initialize the ChompApiService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.initMessenger - The init messenger for reading feature flags.
 * @returns The initialized service.
 */
export const chompApiServiceInit: MessengerClientInitFunction<
  ChompApiService,
  ChompApiServiceMessenger,
  ChompApiServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const env = devApiEnv();
  const devOverrideUrl = CHOMP_URL_BY_DEV_API_ENV[env];

  let baseUrl: string;
  if (devOverrideUrl) {
    Logger.log(LOG_PREFIX, `MM_DEV_API_ENV=${env}; using env URL`, {
      baseUrl: devOverrideUrl,
    });
    baseUrl = devOverrideUrl;
  } else {
    const featureState = initMessenger.call(
      'RemoteFeatureFlagController:getState',
    );
    const chompApiConfig = parseChompApiConfig(
      featureState.remoteFeatureFlags?.earnChompApiConfig,
    );

    if (chompApiConfig) {
      baseUrl = chompApiConfig.baseUrl;
    } else {
      Logger.log(
        LOG_PREFIX,
        'chompApiConfig feature flag not set; falling back to dev URL',
        { fallback: FALLBACK_CHOMP_API_URL },
      );
      baseUrl = FALLBACK_CHOMP_API_URL;
    }
  }

  const controller = new ChompApiService({
    messenger: controllerMessenger,
    baseUrl,
  });

  return { controller };
};
