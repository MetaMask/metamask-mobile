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
 * @returns A mocked ControllerInitRequest.
 */
export function buildControllerInitRequestMock() {
  return {
    baseControllerMessenger: buildControllerMessengerMock(),
    getController: jest.fn(),
    persistedState: jest.fn().mockReturnValue({}),
  } as unknown as jest.Mocked<ControllerInitRequest>;
}
