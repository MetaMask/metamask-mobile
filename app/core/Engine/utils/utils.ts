import { createProjectLogger } from '@metamask/utils';
import type {
  BaseRestrictedControllerMessenger,
  ControllerByName,
  ControllerMessengerCallback,
  ControllerName,
  ControllersToInitialize,
  InitModularizedControllersFunction,
  ControllerInitRequest,
  ControllerInitFunction,
} from '../types';
import { CONTROLLER_MESSENGERS } from '../messengers';

const log = createProjectLogger('controller-init');

type BaseControllerInitRequest = ControllerInitRequest<
  BaseRestrictedControllerMessenger,
  BaseRestrictedControllerMessenger | void
>;

type InitFunction<Name extends ControllersToInitialize> =
  ControllerInitFunction<
    ControllerByName[Name],
    // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
    ReturnType<(typeof CONTROLLER_MESSENGERS)[Name]['getMessenger']>,
    ReturnType<(typeof CONTROLLER_MESSENGERS)[Name]['getInitMessenger']>
  >;

/**
 * Initializes the controllers in the engine in a modular way.
 *
 * @param options - Options bag.
 * @param options.baseControllerMessenger - Unrestricted base controller messenger.
 * @param options.controllerInitFunctions - Map of init functions keyed by controller name.
 * @param options.existingControllersByName - All required controllers that have already been initialized.
 * @param options.getGlobalChainId - Get settled chain id in the engine.
 * @param options.getState - Get the root state of the engine.
 * @param options.persistedState - The full persisted state for all controllers.
 * @returns The initialized controllers and associated data.
 */
export const initModularizedControllers: InitModularizedControllersFunction = ({
  baseControllerMessenger,
  controllerInitFunctions,
  existingControllersByName,
  ...initRequest
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

    const initFunction = controllerInitFunction as InitFunction<
      typeof controllerName
    >;

    // Get the messenger for the controller
    const messengerCallbacks = CONTROLLER_MESSENGERS[controllerName];

    const controllerMessengerCallback =
      messengerCallbacks.getMessenger as ControllerMessengerCallback;

    const initMessengerCallback =
      messengerCallbacks?.getInitMessenger as ControllerMessengerCallback;

    const controllerMessenger = controllerMessengerCallback(
      baseControllerMessenger,
    );

    const initMessenger = initMessengerCallback?.(baseControllerMessenger);

    const finalInitRequest: BaseControllerInitRequest = {
      controllerMessenger,
      getController,
      initMessenger,
      ...initRequest,
    };

    // Initialize the controller
    const { controller } = initFunction(finalInitRequest);

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
export function getControllerOrThrow<Name extends ControllerName>({
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
