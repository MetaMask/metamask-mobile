import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getMultichainRouterInitMessenger,
  getMultichainRouterMessenger,
  MultichainRouterInitMessenger,
} from '../messengers/multichain-router-messenger';
import { ControllerInitRequest } from '../types';
import { multichainRouterInit } from './multichain-router-init';
import {
  MultichainRouter,
  MultichainRouterMessenger,
} from '@metamask/snaps-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/snaps-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    MultichainRouterMessenger,
    MultichainRouterInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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
