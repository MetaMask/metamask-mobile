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
 * @param controllerMessenger - The root messenger to use.
 * @returns A mocked MessengerClientInitRequest.
 */
export function buildMessengerClientInitRequestMock(
  controllerMessenger: RootExtendedMessenger,
): jest.Mocked<MessengerClientInitRequest<ControllerMessenger>> {
  return {
    codefiTokenApiV2: jest.fn() as unknown as CodefiTokenPricesServiceV2,
    controllerMessenger: controllerMessenger as unknown as ControllerMessenger,
    getMessengerClient: jest.fn(),
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
 * Create a generic mock messenger client init function.
 *
 * @template T - The messenger client type
 * @template M - The messenger type
 * @param requiredMessengerClient - Optional name of a required dependency.
 * @returns A mock messenger client init function
 */
export function createMockMessengerClientInitFunction<
  T extends MessengerClient,
  M extends ControllerMessenger,
>(requiredMessengerClient?: string): MessengerClientInitFunction<T, M> {
  return (request) => {
    const { getMessengerClient } = request;

    if (requiredMessengerClient) {
      getMessengerClient(
        requiredMessengerClient as unknown as MessengerClientName,
      );
    }

    return {
      controller: jest.fn() as unknown as T,
    };
  };
}
