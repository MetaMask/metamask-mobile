import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getUserStorageControllerMessenger,
  getUserStorageControllerInitMessenger,
} from '../../messengers/identity/user-storage-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { userStorageControllerInit } from './user-storage-controller-init';
import {
  Controller as UserStorageController,
  UserStorageControllerMessenger,
} from '@metamask/profile-sync-controller/user-storage';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/profile-sync-controller/user-storage');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    UserStorageControllerMessenger,
    ReturnType<typeof getUserStorageControllerInitMessenger>
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getUserStorageControllerMessenger(baseMessenger),
    initMessenger: getUserStorageControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('UserStorageControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = userStorageControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(UserStorageController);
  });

  it('passes the proper arguments to the controller', () => {
    userStorageControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(UserStorageController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      nativeScryptCrypto: expect.any(Function),
      trace: expect.any(Function),
      config: {
        contactSyncing: {
          onContactUpdated: expect.any(Function),
          onContactDeleted: expect.any(Function),
          onContactSyncErroneousSituation: expect.any(Function),
        },
      },
    });
  });
});
