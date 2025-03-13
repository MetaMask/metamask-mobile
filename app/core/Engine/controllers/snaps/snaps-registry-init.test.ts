import { JsonSnapsRegistry } from '@metamask/snaps-controllers';
import { ControllerInitRequest } from '../../types';
import {
  getSnapsRegistryMessenger,
  SnapsRegistryMessenger,
} from '../../messengers/snaps';
import { snapsRegistryInit } from './snaps-registry-init';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('@metamask/snaps-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SnapsRegistryMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

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
    });
  });
});
