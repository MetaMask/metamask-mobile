import type { BaseControllerMessenger, Controllers } from './types';
import type {
  ActionConstraint,
  EventConstraint,
  RestrictedControllerMessenger,
} from '@metamask/base-controller';
import { STATELESS_NON_CONTROLLER_NAMES } from './constants';

export type Controller = Controllers[keyof Controllers];

/** The supported controller names. */
export type ControllerName = keyof Controllers;

/** All controller types by name. */
export type ControllerByName = {
  [name in ControllerName]: Controllers[name];
};

export type BaseRestrictedControllerMessenger = RestrictedControllerMessenger<
  string,
  ActionConstraint,
  EventConstraint,
  string,
  string
>;

/**
 * Specify controllers to initialize.
 */
export type ControllersToInitialize = 'AccountsController';

/**
 * Callback that returns a controller messenger for a specific controller.
 */
type ControllerMessengerCallback = (
  baseControllerMessenger: BaseControllerMessenger,
) => BaseRestrictedControllerMessenger;

/**
 * Persisted state for all controllers.
 * e.g. `{ TransactionController: { transactions: [] } }`.
 */
type ControllerPersistedState = Partial<{
  [Name in Exclude<
    ControllerName,
    (typeof STATELESS_NON_CONTROLLER_NAMES)[number]
  >]: Partial<ControllerByName[Name]['state']>;
}>;

/**
 * Map of controller messengers by controller name.
 */
export type ControllerMessengerByControllerName = {
  [key in ControllersToInitialize]: {
    getMessenger: ControllerMessengerCallback;
  };
};

/**
 * Request to initialize and return a controller instance.
 * Includes standard data and methods not coupled to any specific controller.
 */
export type ControllerInitRequest<
  ControllerMessengerType extends BaseRestrictedControllerMessenger,
> = {
  /**
   * Controller messenger for the client.
   * Used to generate controller for each controller.
   */
  controllerMessenger: ControllerMessengerType;

  /**
   * Retrieve a controller instance by name.
   * Throws an error if the controller is not yet initialized.
   *
   * @param name - The name of the controller to retrieve.
   */
  getController<Name extends ControllerName>(
    name: Name,
  ): ControllerByName[Name];

  /**
   * The full persisted state for all controllers.
   * Includes controller name properties.
   * e.g. `{ TransactionController: { transactions: [] } }`.
   */
  persistedState: ControllerPersistedState;
};

/**
 * Function to initialize a controller instance and return associated data.
 */
export type ControllerInitFunction<
  ControllerType extends Controller,
  ControllerMessengerType extends BaseRestrictedControllerMessenger,
> = (request: ControllerInitRequest<ControllerMessengerType>) => {
  controller: ControllerType;
};

/**
 * Map of controller init functions by controller name.
 */
type ControllerInitFunctionByControllerName = {
  [Name in ControllersToInitialize]: ControllerInitFunction<
    ControllerByName[Name],
    ReturnType<ControllerMessengerByControllerName[Name]['getMessenger']>
  >;
};

/**
 * Function to initialize the controllers in the engine.
 */
export type InitModularizedControllersFunction = (request: {
  controllerInitFunctions: ControllerInitFunctionByControllerName;
  persistedState: ControllerPersistedState;
  existingControllersByName?: Partial<ControllerByName>;
  baseControllerMessenger: BaseControllerMessenger;
}) => {
  controllersByName: ControllerByName;
};
