import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getPermissionControllerMessenger,
  getPermissionControllerInitMessenger,
  PermissionControllerInitMessenger,
} from '../messengers/permission-controller-messenger';
import { ControllerInitRequest } from '../types';
import { permissionControllerInit } from './permission-controller-init';
import {
  PermissionController,
  PermissionControllerMessenger,
} from '@metamask/permission-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/permission-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    PermissionControllerMessenger,
    PermissionControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getPermissionControllerMessenger(baseMessenger),
    initMessenger: getPermissionControllerInitMessenger(baseMessenger),
  };

  // @ts-expect-error: Partial implementation.
  requestMock.getController.mockImplementation((controllerName: string) => {
    if (controllerName === 'ApprovalController') {
      return {
        addAndShowApprovalRequest: jest.fn(),
      };
    }

    if (controllerName === 'KeyringController') {
      return {
        addNewKeyring: jest.fn(),
      };
    }

    throw new Error(`Controller "${controllerName}" not found.`);
  });

  return requestMock;
}

describe('permissionControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = permissionControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(PermissionController);
  });

  it('passes the proper arguments to the controller', () => {
    permissionControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(PermissionController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      caveatSpecifications: expect.any(Object),
      permissionSpecifications: expect.any(Object),
      unrestrictedMethods: expect.any(Array),
    });
  });
});
