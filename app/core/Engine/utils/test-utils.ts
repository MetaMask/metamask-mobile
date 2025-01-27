import { ControllerInitRequest } from '../modular-controller.types';
import { BaseControllerMessenger } from '../types';

/**
 * Build a mock for the BaseControllerMessenger.
 *
 * @param recurse - Whether to recurse and mock the restricted messenger.
 * @returns A mocked BaseControllerMessenger.
 */
export function buildControllerMessengerMock(
  recurse = true,
): jest.Mocked<BaseControllerMessenger> {
  return {
    call: jest.fn(),
    getRestricted: jest
      .fn()
      .mockReturnValue(recurse ? buildControllerMessengerMock(false) : {}),
    publish: jest.fn(),
    registerActionHandler: jest.fn(),
    registerInitialEventPayload: jest.fn(),
    subscribe: jest.fn(),
  } as unknown as jest.Mocked<BaseControllerMessenger>;
}

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
