import {
  BaseRestrictedControllerMessenger,
  ControllerInitRequest,
  BaseControllerMessenger,
} from '../types';

/**
 * Build a mock for the ControllerInitRequest.
 *
 * @returns A mocked ControllerInitRequest.
 */
export function buildControllerInitRequestMock(
  controllerMessenger: BaseControllerMessenger,
): jest.Mocked<ControllerInitRequest<BaseRestrictedControllerMessenger>> {
  return {
    getController: jest.fn(),
    persistedState: {},
    controllerMessenger:
      controllerMessenger as unknown as BaseRestrictedControllerMessenger,
  };
}
