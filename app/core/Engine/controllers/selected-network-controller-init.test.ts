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

  // @ts-expect-error: Partial implementation.
  requestMock.getController.mockImplementation((controllerName: string) => {
    if (controllerName === 'ApprovalController') {
      return {
        addAndShowApprovalRequest: jest.fn(),
      };
    }

    if (controllerName === 'KeyringController') {
      return {
        addNewKeyring: jest.fn(),
      };
    }

    throw new Error(`Controller "${controllerName}" not found.`);
  });

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
