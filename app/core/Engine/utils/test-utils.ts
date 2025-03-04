import {
  BaseRestrictedControllerMessenger,
  ControllerInitFunction,
  Controller,
} from '../types';

import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { ControllerInitFunction } from '../types';

/**
 * Build a mock for the ControllerInitRequest.
 *
 * @returns A mocked ControllerInitRequest.
 */
export function buildControllerInitRequestMock<ControllerMessenger>() {
  const messenger = new ExtendedControllerMessenger();
  return {
    controllerMessenger: messenger as unknown as ControllerMessenger,
    getController: jest.fn(),
    persistedState: {},
    getGlobalChainId: jest.fn(),
    getRootState: jest.fn(),
  };
}

/**
 * Create a generic mock controller init function
 *
 * @template T - The controller type
 * @template M - The messenger type
 * @returns A mock controller init function
 */
export function createMockControllerInitFunction<
  T extends Controller,
  M extends BaseRestrictedControllerMessenger,
>(): ControllerInitFunction<T, M> {
  return (request) => {
    const { getController } = request;

    // This will throw an error if NetworkController is not found
    getController('NetworkController');

    return {
      controller: jest.fn() as unknown as T,
    };
  };
}
