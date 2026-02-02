import {
  ApplicationStateController,
  type ApplicationStateControllerMessenger,
} from '@metamask/application-state-controller';
import type { ControllerInitRequest } from '../../types';

/**
 * Initialize the ApplicationStateController.
 *
 * @param initRequest - The initialization request.
 * @returns The ApplicationStateController.
 */
export function applicationStateControllerInit(
  initRequest: ControllerInitRequest<ApplicationStateControllerMessenger>,
): { controller: ApplicationStateController } {
  const { controllerMessenger } = initRequest;

  const controller = new ApplicationStateController({
    messenger: controllerMessenger,
  });

  return { controller };
}
