import { ControllerInitRequest } from '../modular-controller.types';
import { BaseControllerMessenger } from '../types';

/**
 * Build a mock for the ControllerInitRequest.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns A mocked ControllerInitRequest.
 */
export function buildControllerInitRequestMock(
  baseControllerMessenger: BaseControllerMessenger,
): jest.Mocked<ControllerInitRequest> {
  return {
    baseControllerMessenger,
    getController: jest.fn(),
    persistedState: {},
  };
}
