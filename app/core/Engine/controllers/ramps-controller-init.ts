import { ControllerInitFunction } from '../types';
import {
  RampsController,
  RampsControllerMessenger,
} from '@metamask/ramps-controller';

/**
 * Initialize the ramps controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const rampsControllerInit: ControllerInitFunction<
  RampsController,
  RampsControllerMessenger
> = ({ controllerMessenger }) => {
  const controller = new RampsController({
    messenger: controllerMessenger,
  });

  return {
    controller,
  };
};
