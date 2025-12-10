import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getSelectedNetworkControllerMessenger } from '../messengers/selected-network-controller-messenger';
import { ControllerInitRequest } from '../types';
import { selectedNetworkControllerInit } from './selected-network-controller-init';
import {
  SelectedNetworkController,
  SelectedNetworkControllerMessenger,
} from '@metamask/selected-network-controller';
import DomainProxyMap from '../../../lib/DomainProxyMap/DomainProxyMap';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/selected-network-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SelectedNetworkControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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
