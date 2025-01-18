import {
  ActionConstraint,
  EventConstraint,
  RestrictedControllerMessenger,
} from '@metamask/base-controller';
import { ControllerMessenger, StatefulControllers } from './types';

export type Controller = StatefulControllers[keyof StatefulControllers];

/** The supported controller names. */
export type ControllerName = keyof StatefulControllers;

/** All controller types by name. */
export type ControllerByName = {
  [name in ControllerName]: StatefulControllers[name];
};

/**
 * Persisted state for all controllers.
 * e.g. `{ TransactionController: { transactions: [] } }`.
 */
export type ControllerPersistedState = {
  [name in ControllerName]: ControllerByName[name]['state'];
};

/** Generic controller messenger using base template types. */
export type BaseControllerMessenger = ControllerMessenger;

/** Generic restricted controller messenger using base template types. */
export type BaseRestrictedControllerMessenger = RestrictedControllerMessenger<
  string,
  ActionConstraint,
  EventConstraint,
  string,
  string
>;

/**
 * Request to initialize and return a controller instance.
 * Includes standard data and methods not coupled to any specific controller.
 */
export type ControllerInitRequest = {
  /**
   * Base controller messenger for the client.
   * Used to generate controller and init messengers for each controller.
   */
  baseControllerMessenger: ControllerMessenger;

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
 * A single background API method available to the UI.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ControllerApi = (...args: any[]) => unknown;

/**
 * Result of initializing a controller instance.
 */
export type ControllerInitResult<ControllerType extends Controller> = {
  /**
   * The initialized controller instance.
   */
  controller: ControllerType;
};

/**
 * Function to initialize a controller instance and return associated data.
 */
export type ControllerInitFunction<ControllerType extends Controller> = (
  request: ControllerInitRequest,
) => ControllerInitResult<ControllerType>;
