import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getSnapKeyringBuilderInitMessenger,
  getSnapKeyringBuilderMessenger,
  SnapKeyringBuilderInitMessenger,
  type SnapKeyringBuilderMessenger,
} from '../messengers/snap-keyring-builder-messenger';
import { ControllerInitRequest } from '../types';
import { snapKeyringBuilderInit } from './snap-keyring-builder-init';

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    SnapKeyringBuilderMessenger,
    SnapKeyringBuilderInitMessenger
  >
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSnapKeyringBuilderMessenger(baseMessenger),
    initMessenger: getSnapKeyringBuilderInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('snapKeyringBuilderInit', () => {
  it('initializes the controller', () => {
    const { controller } = snapKeyringBuilderInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(Function);
  });
});
