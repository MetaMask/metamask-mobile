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
import { createMockControllerInitFunction } from './test-utils';
import { getControllerOrThrow, initModularizedControllers } from './utils';
import { permissionControllerInit } from '../controllers/permission-controller-init';
import {
  CaveatSpecificationConstraint,
  PermissionController,
  PermissionSpecificationConstraint,
} from '@metamask/permission-controller';
import { InitModularizedControllersFunctionRequest } from '../types';
import { QrKeyringDeferredPromiseBridge } from '@metamask/eth-qr-keyring';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../controllers/accounts-controller');
jest.mock('../controllers/approval-controller');
jest.mock('../controllers/permission-controller-init');
jest.mock('../controllers/delegation/delegation-controller-init');

describe('initModularizedControllers', () => {
  const mockAccountsControllerInit = jest.mocked(accountsControllerInit);
  const mockApprovalControllerInit = jest.mocked(ApprovalControllerInit);
  const mockPermissionControllerInit = jest.mocked(permissionControllerInit);

  function buildModularizedControllerRequest(
    overrides?: Record<string, unknown>,
  ): InitModularizedControllersFunctionRequest {
    const partialRequest = merge(
      {
        existingControllersByName: {},
        controllerInitFunctions: {
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
    return partialRequest as InitModularizedControllersFunctionRequest;
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockAccountsControllerInit.mockReturnValue({
      controller: {} as unknown as AccountsController,
    });
    mockApprovalControllerInit.mockReturnValue({
      controller: {} as unknown as ApprovalController,
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
    const controllers = initModularizedControllers(request);

    expect(controllers.controllersByName.AccountsController).toBeDefined();
    expect(controllers.controllersByName.ApprovalController).toBeDefined();
    expect(controllers.controllersByName.PermissionController).toBeDefined();
  });

  it('initializes function including initMessenger', () => {
    const request = buildModularizedControllerRequest();
    initModularizedControllers(request);

    const permissionControllerInitMessenger =
      mockPermissionControllerInit.mock.calls[0][0].initMessenger;

    expect(permissionControllerInitMessenger).toBeDefined();
  });

  it('throws when controller is not found', async () => {
    const request = buildModularizedControllerRequest({
      controllerInitFunctions: {
        AccountsController: createMockControllerInitFunction<
          AccountsController,
          AccountsControllerMessenger
        >('NetworkController'),
      },
    });

    expect(() => initModularizedControllers(request)).toThrow(
      'Controller requested before it was initialized: NetworkController',
    );
  });

  it('not throws when when existing controller is found', async () => {
    const request = buildModularizedControllerRequest({
      existingControllersByName: {
        NetworkController: jest.fn() as unknown as NetworkController,
      },
    });

    expect(() => initModularizedControllers(request)).not.toThrow();
  });
});

describe('getControllerOrThrow', () => {
  it('throws when controller is not found', () => {
    expect(() =>
      getControllerOrThrow({
        controller: undefined,
        name: 'AccountsController',
      }),
    ).toThrow();
  });

  it('not throws when controller is found', () => {
    expect(() =>
      getControllerOrThrow({
        controller: jest.fn() as unknown as AccountsController,
        name: 'AccountsController',
      }),
    ).not.toThrow();
  });
});
