import { createProjectLogger } from '@metamask/utils';
import type {
  ControllerByName,
  ControllerName,
  ControllersToInitialize,
  InitModularizedControllersFunction,
} from '../modular-controller.types';
import { CONTROLLER_MESSENGERS } from '../messengers';

const log = createProjectLogger('controller-init');

/**
 * Initializes the controllers in the engine in a modular way.
 *
 * @param options - Options bag.
 * @param options.controllerInitFunctions - Array of init functions.
 * @param options.initRequest - Base request used to initialize the controllers.

 * @returns The initialized controllers and associated data.
 */
export const initModularizedControllers: InitModularizedControllersFunction = ({
  controllerInitFunctions,
  persistedState,
  existingControllersByName,
  baseControllerMessenger,
}) => {
  log('Initializing controllers', Object.keys(controllerInitFunctions).length);

  // Used by other controllers to get dependent controllers
  const getController = <Name extends ControllerName>(
    name: Name,
  ): ControllerByName[Name] =>
    getControllerOrThrow({
      controller: existingControllersByName?.[name],
      name,
    });

  for (const [key, controllerInitFunction] of Object.entries(
    controllerInitFunctions,
  )) {
    const controllerName = key as ControllersToInitialize;

    // Get the messenger for the controller
    const messengerCallbacks = CONTROLLER_MESSENGERS[controllerName];
    const controllerMessenger = messengerCallbacks.getMessenger(
      baseControllerMessenger,
    );

    // Initialize the controller
    const { controller } = controllerInitFunction({
      persistedState,
      getController,
      controllerMessenger,
    });

    // Add the controller to the existing controllers by name
    existingControllersByName = {
      ...existingControllersByName,
      [controllerName]: controller,
    };

    log('Initialized controller', controllerName);
  }

  return {
    controllersByName: existingControllersByName as ControllerByName,
  };
};

/**
 * Gets a controller from the existing controllers by name.
 * Throws an error if the controller is not found.
 *
 * @param options - Options containing the controller and name.
 * @param options.controller - The controller to get.
 * @param options.name - The name of the controller.
 * @returns The controller.
 */
function getControllerOrThrow<Name extends ControllerName>({
  controller,
  name,
}: {
  controller: Partial<ControllerByName>[Name];
  name: Name;
}): ControllerByName[Name] {
  if (!controller) {
    throw new Error(`Controller requested before it was initialized: ${name}`);
  }

  return controller;
}
