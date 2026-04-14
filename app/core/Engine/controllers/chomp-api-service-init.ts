import {
  ChompApiService,
  type ChompApiServiceMessenger,
} from '@metamask-previews/chomp-api-service';
import type { MessengerClientInitFunction } from '../types';
import AppConstants from '../../AppConstants';

/**
 * Initialize the ChompApiService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const chompApiServiceInit: MessengerClientInitFunction<
  ChompApiService,
  ChompApiServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new ChompApiService({
    messenger: controllerMessenger,
    baseUrl: AppConstants.CHOMP_API_URL,
  });

  return { controller };
};
