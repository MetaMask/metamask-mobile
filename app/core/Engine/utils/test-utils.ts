import {
  BaseRestrictedControllerMessenger,
  ControllerInitFunction,
  Controller,
} from '../types';

/**
 * Build a mock for the ControllerInitRequest.
 *
 * @returns A mocked ControllerInitRequest.
 */
export function buildControllerInitRequestMock() {
  return {
    getController: jest.fn(),
    persistedState: {},
    getCurrentChainId: jest.fn(),
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
