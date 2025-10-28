import { ControllerInitFunction } from '../types';
import { LoggingController } from '@metamask/logging-controller';
import { LoggingControllerMessenger } from '../messengers/logging-controller-messenger';

/**
 * Initialize the logging controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const loggingControllerInit: ControllerInitFunction<
  LoggingController,
  LoggingControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new LoggingController({
    messenger: controllerMessenger,
    state: persistedState.LoggingController,
  });

  return {
    controller,
  };
};
