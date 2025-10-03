import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getNetworkControllerInitMessenger,
  getNetworkControllerMessenger,
  NetworkControllerInitMessenger,
  type NetworkControllerMessenger,
} from '../messengers/network-controller-messenger';
import { ControllerInitRequest } from '../types';
import {
  ADDITIONAL_DEFAULT_NETWORKS,
  getInitialNetworkControllerState,
  networkControllerInit,
} from './network-controller-init';
import {
  getDefaultNetworkControllerState,
  NetworkController,
} from '@metamask/network-controller';

jest.mock('@metamask/network-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    NetworkControllerMessenger,
    NetworkControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getNetworkControllerMessenger(baseMessenger),
    initMessenger: getNetworkControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('networkControllerInit', () => {
  jest
    .mocked(getDefaultNetworkControllerState)
    .mockImplementation((additionalNetworks) =>
      jest
        .requireActual('@metamask/network-controller')
        .getDefaultNetworkControllerState(additionalNetworks),
    );

  it('initializes the controller', () => {
    const { controller } = networkControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(NetworkController);
  });

  it('passes the proper arguments to the controller', () => {
    networkControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NetworkController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: getInitialNetworkControllerState({}),
      additionalDefaultNetworks: ADDITIONAL_DEFAULT_NETWORKS,
      getBlockTrackerOptions: expect.any(Function),
      getRpcServiceOptions: expect.any(Function),
      infuraProjectId: 'NON_EMPTY',
    });
  });
});
