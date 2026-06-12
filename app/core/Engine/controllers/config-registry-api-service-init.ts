import { SDK } from '@metamask/profile-sync-controller';
import {
  ConfigRegistryApiService,
  ConfigRegistryApiServiceMessenger,
} from '@metamask/config-registry-controller';
import { MessengerClientInitFunction } from '../types';

/**
 * Initialize ConfigRegistryAPIService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized controller.
 */
export const configRegistryApiServiceInit: MessengerClientInitFunction<
  ConfigRegistryApiService,
  ConfigRegistryApiServiceMessenger
> = ({ controllerMessenger }) => {
  // The environment must be the same used by AuthenticationController.
  const env = SDK.Env.PRD;

  const controller = new ConfigRegistryApiService({
    messenger: controllerMessenger,
    fetch: fetch.bind(globalThis),
    env,
  });

  return {
    controller,
  };
};
