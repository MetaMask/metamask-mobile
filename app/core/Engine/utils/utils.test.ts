import {
  AccountsController,
  AccountsControllerMessenger,
} from '@metamask/accounts-controller';
import { ApprovalController } from '@metamask/approval-controller';
import { CodefiTokenPricesServiceV2 } from '@metamask/assets-controllers';
import { NetworkController } from '@metamask/network-controller';
import { merge } from 'lodash';

import { ExtendedMessenger } from '../../ExtendedMessenger';
import { accountsControllerInit } from '../controllers/accounts-controller';
import { ApprovalControllerInit } from '../controllers/approval-controller';
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

jest.mock('../controllers/accounts-controller');
jest.mock('../controllers/approval-controller');
jest.mock('../controllers/permission-controller-init');
jest.mock('../controllers/delegation/delegation-controller-init');

describe('initMessengerClients', () => {
  const mockAccountsControllerInit = jest.mocked(accountsControllerInit);
  const mockApprovalControllerInit = jest.mocked(ApprovalControllerInit);
  const mockPermissionControllerInit = jest.mocked(permissionControllerInit);

  function buildModularizedControllerRequest(
    overrides?: Record<string, unknown>,
  ): InitMessengerClientsFunctionRequest {
    const partialRequest = merge(
      {
        initFunctions: {
          AccountsController: mockAccountsControllerInit,
          ApprovalController: mockApprovalControllerInit,
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

    mockAccountsControllerInit.mockReturnValue({
      messengerClient: {} as unknown as AccountsController,
    });
    mockApprovalControllerInit.mockReturnValue({
      messengerClient: {} as unknown as ApprovalController,
    });
    mockPermissionControllerInit.mockReturnValue({
      messengerClient: {} as unknown as PermissionController<
        PermissionSpecificationConstraint,
        CaveatSpecificationConstraint
      >,
    });
  });

  it('initializes controllers', () => {
    const request = buildModularizedControllerRequest();
    const controllers = initMessengerClients(request);

    expect(controllers.messengerClientsByName.AccountsController).toBeDefined();
    expect(controllers.messengerClientsByName.ApprovalController).toBeDefined();
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
        AccountsController: createMockMessengerClientInitFunction<
          AccountsController,
          AccountsControllerMessenger
        >('NetworkController'),
      },
    });

    expect(() => initMessengerClients(request)).toThrow(
      'Messenger client requested before it was initialized: NetworkController',
    );
  });
});

describe('getMessengerClientOrThrow', () => {
  it('throws when controller is not found', () => {
    expect(() =>
      getMessengerClientOrThrow({
        messengerClient: undefined,
        name: 'AccountsController',
      }),
    ).toThrow();
  });

  it('not throws when controller is found', () => {
    expect(() =>
      getMessengerClientOrThrow({
        messengerClient: jest.fn() as unknown as AccountsController,
        name: 'AccountsController',
      }),
    ).not.toThrow();
  });
});
