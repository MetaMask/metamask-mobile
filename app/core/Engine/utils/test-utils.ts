import {
  BaseRestrictedControllerMessenger,
  ControllerInitRequest,
} from '../modular-controller.types';
import { BaseControllerMessenger } from '../types';

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
    controllerMessenger: controllerMessenger as any,
  };
}
