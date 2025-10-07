import {
  BaseRestrictedControllerMessenger,
  BaseControllerMessenger,
  ControllerInitFunction,
  Controller,
  ControllerName,
  ControllerInitRequest,
} from '../types';
import { QrKeyringDeferredPromiseBridge } from '@metamask/eth-qr-keyring';

/**
 * Build a mock for the ControllerInitRequest.
 *
 * @returns A mocked ControllerInitRequest.
 */
export function buildControllerInitRequestMock(
  controllerMessenger: BaseControllerMessenger,
): jest.Mocked<ControllerInitRequest<BaseRestrictedControllerMessenger>> {
  return {
    controllerMessenger:
      controllerMessenger as unknown as BaseRestrictedControllerMessenger,
    getController: jest.fn(),
    getGlobalChainId: jest.fn(),
    getState: jest.fn(),
    initMessenger: jest.fn() as unknown as void,
    qrKeyringScanner: jest.fn() as unknown as QrKeyringDeferredPromiseBridge,
    removeAccount: jest.fn(),
    persistedState: {},
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
>(requiredController?: string): ControllerInitFunction<T, M> {
  return (request) => {
    const { getController } = request;

    if (requiredController) {
      getController(requiredController as unknown as ControllerName);
    }

    return {
      controller: jest.fn() as unknown as T,
    };
  };
}
