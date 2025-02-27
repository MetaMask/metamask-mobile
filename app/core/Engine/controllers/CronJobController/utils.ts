import {
  CronjobController,
  CronjobControllerMessenger,
  CronjobControllerState,
} from '@metamask/snaps-controllers';
import Logger from '../../../../util/Logger';

export const createCronJobController = (
  controllerMessenger: CronjobControllerMessenger,
  initialState?: CronjobControllerState,
): CronjobController => {
  try {
    const cronjobController = new CronjobController({
      messenger: controllerMessenger,
      state: initialState ?? undefined,
    });
    return cronjobController;
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize CronjobController');
    throw error;
  }
};
