import {
  GeolocationApiService,
  Env,
  type GeolocationApiServiceMessenger,
} from '@metamask/geolocation-controller';
import { SdkEnvironment } from '@consensys/native-ramps-sdk';
import { getSdkEnvironment } from '../../../components/UI/Ramp/Deposit/sdk/getSdkEnvironment';
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

  const messengerClient = new GeolocationApiService({
    messenger: controllerMessenger,
    env,
    fetch: fetch.bind(globalThis),
  });

  return { messengerClient };
};
