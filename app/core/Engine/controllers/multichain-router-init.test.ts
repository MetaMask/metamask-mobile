import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getMultichainRouterInitMessenger,
  getMultichainRouterMessenger,
  MultichainRouterInitMessenger,
  type MultichainRouterMessenger,
} from '../messengers/multichain-router-messenger';
import { ControllerInitRequest } from '../types';
import { multichainRouterInit } from './multichain-router-init';
import { MultichainRouter } from '@metamask/snaps-controllers';

jest.mock('@metamask/snaps-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    MultichainRouterMessenger,
    MultichainRouterInitMessenger
  >
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getMultichainRouterMessenger(baseMessenger),
    initMessenger: getMultichainRouterInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('MultichainRouterInit', () => {
  it('initializes the controller', () => {
    const { controller } = multichainRouterInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(MultichainRouter);
  });

  it('passes the proper arguments to the controller', () => {
    multichainRouterInit(getInitRequestMock());

    const controllerMock = jest.mocked(MultichainRouter);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      withSnapKeyring: expect.any(Function),
    });
  });
});
