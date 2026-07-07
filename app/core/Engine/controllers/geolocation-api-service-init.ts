import {
  GeolocationApiService,
  Env,
  type GeolocationApiServiceMessenger,
} from '@metamask/geolocation-controller';
import { SdkEnvironment } from '../../../components/UI/Ramp/types/legacyDeposit';
import { getSdkEnvironment } from '../../../components/UI/Ramp/utils/getSdkEnvironment';
import type { MessengerClientInitFunction } from '../types';

/**
 * Initialize the GeolocationApiService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const geolocationApiServiceInit: MessengerClientInitFunction<
  GeolocationApiService,
  GeolocationApiServiceMessenger
> = ({ controllerMessenger }) => {
  const sdkEnv = getSdkEnvironment();
  const env = sdkEnv === SdkEnvironment.Production ? Env.PRD : Env.DEV;

  const controller = new GeolocationApiService({
    messenger: controllerMessenger,
    env,
    fetch: fetch.bind(globalThis),
  });

  return { controller };
};
