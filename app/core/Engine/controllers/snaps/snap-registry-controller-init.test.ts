import {
  SnapRegistryController,
  SnapRegistryControllerMessenger,
} from '@metamask/snaps-controllers';
import { MessengerClientInitRequest } from '../../types';
import { getSnapRegistryControllerMessenger } from '../../messengers/snaps';
import { snapRegistryControllerInit } from './snap-registry-controller-init';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/snaps-controllers');

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.59.0'),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<SnapRegistryControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getSnapRegistryControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('SnapRegistryControllerInit', () => {
  it('initializes the controller', () => {
    const { messengerClient } =
      snapRegistryControllerInit(getInitRequestMock());
    expect(messengerClient).toBeInstanceOf(SnapRegistryController);
  });

  it('passes the proper arguments to the controller', () => {
    snapRegistryControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(SnapRegistryController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      refetchOnAllowlistMiss: false,
      clientConfig: {
        type: 'mobile',
        version: '7.59.0',
      },
    });
  });
});
