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
  // Create mock init messenger with AnalyticsController actions
  const mockInitMessenger = {
    call: jest.fn((action: string, ..._args: unknown[]) => {
      if (action === 'AnalyticsController:trackEvent') {
        return Promise.resolve();
      }
      if (action === 'AnalyticsController:getState') {
        return Promise.resolve({
          analyticsId: 'f2673eb8-db32-40bb-88a5-97cf5107d31d',
          optedInForRegularAccount: false,
          optedInForSocialAccount: false,
        });
      }
      // Handle other AnalyticsController actions as needed
      return Promise.resolve(undefined);
    }),
    subscribe: jest.fn(),
    publish: jest.fn(),
    registerActionHandler: jest.fn(),
    registerEventHandler: jest.fn(),
    unregisterActionHandler: jest.fn(),
    unregisterEventHandler: jest.fn(),
  };

  return {
    codefiTokenApiV2: jest.fn() as unknown as CodefiTokenPricesServiceV2,
    controllerMessenger: controllerMessenger as unknown as ControllerMessenger,
    getController: jest.fn(),
    getGlobalChainId: jest.fn(),
    analyticsDefaults: {
      analyticsId: 'f2673eb8-db32-40bb-88a5-97cf5107d31d',
      optedInForRegularAccount: false,
      optedInForSocialAccount: false,
    },
    getState: jest.fn(),
    initMessenger: mockInitMessenger as unknown as ControllerMessenger,
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
