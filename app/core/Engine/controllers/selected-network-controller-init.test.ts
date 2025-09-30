import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getSelectedNetworkControllerMessenger,
  type SelectedNetworkControllerMessenger,
} from '../messengers/selected-network-controller-messenger';
import { ControllerInitRequest } from '../types';
import { selectedNetworkControllerInit } from './selected-network-controller-init';
import { SelectedNetworkController } from '@metamask/selected-network-controller';
import DomainProxyMap from '../../../lib/DomainProxyMap/DomainProxyMap';

jest.mock('@metamask/selected-network-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SelectedNetworkControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSelectedNetworkControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('SelectedNetworkControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = selectedNetworkControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SelectedNetworkController);
  });

  it('passes the proper arguments to the controller', () => {
    selectedNetworkControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(SelectedNetworkController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: {
        activeDappNetwork: null,
        domains: {},
      },
      domainProxyMap: expect.any(DomainProxyMap),
    });
  });
});
