import {
  RampsActivityService,
  RampsActivityServiceMessenger,
} from '@metamask/core-backend';
import { MessengerClientInitFunction } from '../../types';
import Logger from '../../../../util/Logger';

/**
 * Initialize the Ramps Activity service.
 *
 * Subscribes to Gateway `ramps-activity.v1.<profileId>`. Domain state stays
 * in RampsController (GET is source of truth).
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const rampsActivityServiceInit: MessengerClientInitFunction<
  RampsActivityService,
  RampsActivityServiceMessenger
> = ({ controllerMessenger }) => {
  Logger.log('Initializing RampsActivityService');

  const controller = new RampsActivityService({
    messenger: controllerMessenger,
  });

  controller.init().catch((error: unknown) => {
    Logger.error(error as Error, 'RampsActivityService: failed to initialize');
  });

  Logger.log('RampsActivityService initialized');

  return {
    controller,
  };
};
