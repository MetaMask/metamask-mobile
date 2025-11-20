import { JsonSnapsRegistry } from '@metamask/snaps-controllers';
import { ControllerInitRequest } from '../../types';
import {
  getSnapsRegistryMessenger,
  SnapsRegistryMessenger,
} from '../../messengers/snaps';
import { snapsRegistryInit } from './snaps-registry-init';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/snaps-controllers');

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.59.0'),
}));

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SnapsRegistryMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSnapsRegistryMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('SnapsRegistryInit', () => {
  it('initializes the controller', () => {
    const { controller } = snapsRegistryInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(JsonSnapsRegistry);
  });

  it('passes the proper arguments to the controller', () => {
    snapsRegistryInit(getInitRequestMock());

    const controllerMock = jest.mocked(JsonSnapsRegistry);
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
