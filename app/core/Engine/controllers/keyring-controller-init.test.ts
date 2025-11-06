import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getKeyringControllerMessenger,
  type KeyringControllerMessenger,
} from '../messengers/keyring-controller-messenger';
import { ControllerInitRequest } from '../types';
import { keyringControllerInit } from './keyring-controller-init';
import { KeyringController } from '@metamask/keyring-controller';
import { Encryptor } from '../../Encryptor';

jest.mock('@metamask/keyring-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<KeyringControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

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
      cacheEncryptionKey: true,
      encryptor: expect.any(Encryptor),
      keyringBuilders: expect.any(Array),
      removeIdentity: expect.any(Function),
    });
  });
});
