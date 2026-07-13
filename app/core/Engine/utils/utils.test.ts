import { AccountsController } from '@metamask/accounts-controller';
import {
  LoggingController,
  LoggingControllerMessenger,
} from '@metamask/logging-controller';
import { CodefiTokenPricesServiceV2 } from '@metamask/assets-controllers';
import { merge } from 'lodash';

import { ExtendedMessenger } from '../../ExtendedMessenger';
import { loggingControllerInit } from '../controllers/logging-controller-init';
import { createMockMessengerClientInitFunction } from './test-utils';
import { getMessengerClientOrThrow, initMessengerClients } from './utils';
import { permissionControllerInit } from '../controllers/permission-controller-init';
import {
  CaveatSpecificationConstraint,
  PermissionController,
  PermissionSpecificationConstraint,
} from '@metamask/permission-controller';
import { InitMessengerClientsFunctionRequest } from '../types';
import { QrKeyringDeferredPromiseBridge } from '@metamask/eth-qr-keyring';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { Wallet } from '@metamask/wallet';

jest.mock('../controllers/logging-controller-init');
jest.mock('../controllers/permission-controller-init');
jest.mock('../controllers/delegation/delegation-controller-init');

describe('initMessengerClients', () => {
  const mockLoggingControllerInit = jest.mocked(loggingControllerInit);
  const mockPermissionControllerInit = jest.mocked(permissionControllerInit);

  function buildModularizedControllerRequest(
    overrides?: Record<string, unknown>,
  ): InitMessengerClientsFunctionRequest {
    const partialRequest = merge(
      {
        wallet: { getInstance: jest.fn() } as unknown as Wallet,
        initFunctions: {
          LoggingController: mockLoggingControllerInit,
          PermissionController: mockPermissionControllerInit,
        },
        persistedState: {},
        baseControllerMessenger: new ExtendedMessenger<MockAnyNamespace>({
          namespace: MOCK_ANY_NAMESPACE,
        }),
        codefiTokenApiV2: jest.fn() as unknown as CodefiTokenPricesServiceV2,
        getGlobalChainId: jest.fn(),
        getState: jest.fn(),
        removeAccount: jest.fn(),
        qrKeyringScanner:
          jest.fn() as unknown as QrKeyringDeferredPromiseBridge,
        initialKeyringState: null,
      },
      overrides,
    );

    // @ts-expect-error: Intentionally only providing a subset of all
    // controllers, to avoid excessive boilerplate in tests.
    return partialRequest as InitMessengerClientsFunctionRequest;
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockLoggingControllerInit.mockReturnValue({
      controller: {} as unknown as LoggingController,
    });
    mockPermissionControllerInit.mockReturnValue({
      controller: {} as unknown as PermissionController<
        PermissionSpecificationConstraint,
        CaveatSpecificationConstraint
      >,
    });
  });

  it('initializes controllers', () => {
    const request = buildModularizedControllerRequest();
    const controllers = initMessengerClients(request);

    expect(controllers.messengerClientsByName.LoggingController).toBeDefined();
    expect(
      controllers.messengerClientsByName.PermissionController,
    ).toBeDefined();
  });

  it('initializes function including initMessenger', () => {
    const request = buildModularizedControllerRequest();
    initMessengerClients(request);

    const permissionControllerInitMessenger =
      mockPermissionControllerInit.mock.calls[0][0].initMessenger;

    expect(permissionControllerInitMessenger).toBeDefined();
  });

  it('throws when controller is not found', async () => {
    const request = buildModularizedControllerRequest({
      initFunctions: {
        LoggingController: createMockMessengerClientInitFunction<
          LoggingController,
          LoggingControllerMessenger
        >('GasFeeController'),
      },
    });

    expect(() => initMessengerClients(request)).toThrow(
      'Messenger client requested before it was initialized: GasFeeController',
    );
  });
});

describe('getMessengerClientOrThrow', () => {
  it('throws when controller is not found', () => {
    expect(() =>
      getMessengerClientOrThrow({
        wallet: { getInstance: jest.fn() } as unknown as Wallet,
        messengerClientsByName: {},
        name: 'AccountsController',
      }),
    ).toThrow();
  });

  it('does not throw when controller is found', () => {
    expect(() =>
      getMessengerClientOrThrow({
        wallet: { getInstance: jest.fn() } as unknown as Wallet,
        messengerClientsByName: {
          AccountsController: jest.fn() as unknown as AccountsController,
        },
        name: 'AccountsController',
      }),
    ).not.toThrow();
  });
});
