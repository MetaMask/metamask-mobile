import { SnapInterfaceController } from '@metamask/snaps-controllers';
import { ControllerInitRequest } from '../../types';
import {
  getSnapInterfaceControllerMessenger,
  SnapInterfaceControllerMessenger,
} from '../../messengers/snaps';
import { snapInterfaceControllerInit } from './snap-interface-controller-init';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('@metamask/snaps-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SnapInterfaceControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSnapInterfaceControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('SnapInterfaceControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = snapInterfaceControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SnapInterfaceController);
  });

  it('passes the proper arguments to the controller', () => {
    snapInterfaceControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(SnapInterfaceController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
    });
  });
});
