import {
  ControllerMessenger,
  RootExtendedMessenger,
  MessengerClientInitFunction,
  MessengerClient,
  MessengerClientName,
  MessengerClientInitRequest,
} from '../types';
import { QrKeyringDeferredPromiseBridge } from '@metamask/eth-qr-keyring';
import { CodefiTokenPricesServiceV2 } from '@metamask/assets-controllers';

/**
 * Build a mock for the MessengerClientInitRequest.
 *
 * @returns A mocked MessengerClientInitRequest.
 */
export function buildControllerInitRequestMock(
  controllerMessenger: RootExtendedMessenger,
): jest.Mocked<MessengerClientInitRequest<ControllerMessenger>> {
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
  T extends MessengerClient,
  M extends ControllerMessenger,
>(requiredController?: string): MessengerClientInitFunction<T, M> {
  return (request) => {
    const { getController } = request;

    if (requiredController) {
      getController(requiredController as unknown as MessengerClientName);
    }

    return {
      controller: jest.fn() as unknown as T,
    };
  };
}
