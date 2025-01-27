import { BaseControllerMessenger, Controllers } from './types';
import { STATELESS_NON_CONTROLLER_NAMES } from './constants';

export type Controller = Controllers[keyof Controllers];

/** The supported controller names. */
export type ControllerName = keyof Controllers;

/** All controller types by name. */
export type ControllerByName = {
  [name in ControllerName]: Controllers[name];
};

/**
 * Persisted state for all controllers.
 * e.g. `{ TransactionController: { transactions: [] } }`.
 */
export type ControllerPersistedState = Partial<{
  [Name in Exclude<
    ControllerName,
    (typeof STATELESS_NON_CONTROLLER_NAMES)[number]
  >]: Partial<ControllerByName[Name]['state']>;
}>;

/**
 * Request to initialize and return a controller instance.
 * Includes standard data and methods not coupled to any specific controller.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ControllerInitRequest = {
  /**
   * Base controller messenger for the client.
   * Used to generate controller and init messengers for each controller.
   */
  baseControllerMessenger: BaseControllerMessenger;

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
 * Result of initializing a controller instance.
 */
export interface ControllerInitResult<ControllerType extends Controller> {
  /**
   * The initialized controller instance.
   */
  controller: ControllerType;
}

/**
 * Function to initialize a controller instance and return associated data.
 */
export type ControllerInitFunction<ControllerType extends Controller> = (
  request: ControllerInitRequest,
) => ControllerInitResult<ControllerType>;
