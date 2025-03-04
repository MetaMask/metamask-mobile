import {
  CronjobController,
  type CronjobControllerMessenger,
  CronjobControllerState,
} from '@metamask/snaps-controllers';
import type { ControllerInitFunction } from '../../types';
import { defaultCronjobControllerState } from './constants';

// Export constants
export * from './constants';

/**
 * Initialize the CronjobController.
 *
 * @param request - The request object.
 * @returns The CronjobController.
 */
export const cronjobControllerInit: ControllerInitFunction<
  CronjobController,
  CronjobControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const cronjobControllerState = (persistedState.CronjobController ??
    defaultCronjobControllerState) as CronjobControllerState;

  const controller = new CronjobController({
    messenger: controllerMessenger,
    state: cronjobControllerState,
  });

  return { controller };
};
