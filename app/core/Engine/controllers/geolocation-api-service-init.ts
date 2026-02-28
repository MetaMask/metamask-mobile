import {
  GeolocationApiService,
  type GeolocationApiServiceMessenger,
} from '@metamask/geolocation-controller';
import { SDK } from '@metamask/profile-sync-controller';
import { SdkEnvironment } from '@consensys/native-ramps-sdk';
import { getSdkEnvironment } from '../../../components/UI/Ramp/Deposit/sdk/getSdkEnvironment';
import type { ControllerInitFunction } from '../types';

/**
 * Initialize the GeolocationApiService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const geolocationApiServiceInit: ControllerInitFunction<
  GeolocationApiService,
  GeolocationApiServiceMessenger
> = ({ controllerMessenger }) => {
  const sdkEnv = getSdkEnvironment();
  const env = sdkEnv === SdkEnvironment.Production ? SDK.Env.PRD : SDK.Env.DEV;

  const controller = new GeolocationApiService({
    messenger: controllerMessenger,
    env,
    fetch: fetch.bind(globalThis),
  });

  return { controller };
};
