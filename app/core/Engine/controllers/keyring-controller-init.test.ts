import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getKeyringControllerMessenger } from '../messengers/keyring-controller-messenger';
import { ControllerInitRequest } from '../types';
import { keyringControllerInit } from './keyring-controller-init';
import {
  KeyringController,
  KeyringControllerMessenger,
} from '@metamask/keyring-controller';
import { Encryptor } from '../../Encryptor';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/keyring-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<KeyringControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getKeyringControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  // @ts-expect-error: Partial implementation.
  requestMock.getController.mockImplementation((controllerName: string) => {
    if (controllerName === 'SnapKeyringBuilder') {
      return jest.fn();
    }

    if (controllerName === 'PreferencesController') {
      return jest.fn();
    }

    throw new Error(`Controller "${controllerName}" not found.`);
  });

  return requestMock;
}

describe('keyringControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = keyringControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(KeyringController);
  });

  it('passes the proper arguments to the controller', () => {
    keyringControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(KeyringController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      encryptor: expect.any(Encryptor),
      keyringBuilders: expect.any(Array),
      removeIdentity: expect.any(Function),
    });
  });
});
