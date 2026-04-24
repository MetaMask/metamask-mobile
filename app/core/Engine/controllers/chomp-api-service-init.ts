import {
  ChompApiService,
  type ChompApiServiceMessenger,
} from '@metamask/chomp-api-service';
import type { MessengerClientInitFunction } from '../types';
import type { ChompApiServiceInitMessenger } from '../messengers/chomp-api-service-messenger';
import { parseChompApiConfig } from '../../../selectors/featureFlagController/chompApi';
import Logger from '../../../util/Logger';

const LOG_PREFIX = '[ChompApiServiceInit]';

// Fallback used only when the remote feature flag has not hydrated yet (e.g.
// first launch, offline). Points at dev so unconfigured builds fail fast
// against a non-prod backend; prod deployments must ship with the flag set.
const FALLBACK_CHOMP_API_URL = 'https://chomp.dev-api.cx.metamask.io';

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
  const featureState = initMessenger.call(
    'RemoteFeatureFlagController:getState',
  );
  const chompApiConfig = parseChompApiConfig(
    featureState.remoteFeatureFlags?.earnChompApiConfig,
  );

  let baseUrl: string;
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

  const controller = new ChompApiService({
    messenger: controllerMessenger,
    baseUrl,
  });

  return { controller };
};
