import {
  ChompApiService,
  type ChompApiServiceMessenger,
} from '@metamask-previews/chomp-api-service';
import type { MessengerClientInitFunction } from '../types';
import type { ChompApiServiceInitMessenger } from '../messengers/chomp-api-service-messenger';
import type { ChompApiConfig } from '../../../selectors/featureFlagController/chompApi';

const DEFAULT_CHOMP_API_URL = 'https://chomp.api.cx.metamask.io';

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
  const chompApiConfig = featureState.remoteFeatureFlags
    ?.chompApiConfig as unknown as ChompApiConfig | undefined;
  const baseUrl = chompApiConfig?.baseUrl ?? DEFAULT_CHOMP_API_URL;

  const controller = new ChompApiService({
    messenger: controllerMessenger,
    baseUrl,
  });

  return { controller };
};
