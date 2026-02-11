import {
  ControllerMessenger,
  RootExtendedMessenger,
  ControllerInitFunction,
  Controller,
  ControllerName,
  ControllerInitRequest,
} from '../types';
import { QrKeyringDeferredPromiseBridge } from '@metamask/eth-qr-keyring';
import { CodefiTokenPricesServiceV2 } from '@metamask/assets-controllers';

/**
 * Build a mock for the ControllerInitRequest.
 *
 * @returns A mocked ControllerInitRequest.
 */
export function buildControllerInitRequestMock(
  controllerMessenger: RootExtendedMessenger,
): jest.Mocked<ControllerInitRequest<ControllerMessenger>> {
  return {
    codefiTokenApiV2: jest.fn() as unknown as CodefiTokenPricesServiceV2,
    controllerMessenger: controllerMessenger as unknown as ControllerMessenger,
    getController: jest.fn(),
    getGlobalChainId: jest.fn(),
    analyticsId: '59710bcf-06cc-4247-9386-12425e7fc905',
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
  M extends ControllerMessenger,
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
