import {
  SentinelApiService,
  type SentinelApiServiceMessenger,
} from '@metamask/sentinel-api-service';
import type { MessengerClientInitFunction } from '../types';

/**
 * Initialize the SentinelApiService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const sentinelApiServiceInit: MessengerClientInitFunction<
  SentinelApiService,
  SentinelApiServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new SentinelApiService({
    messenger: controllerMessenger,
    fetch: fetch.bind(globalThis),
    clientId: 'mobile',
  });

  return { controller };
};
