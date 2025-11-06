import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getAssetsContractControllerMessenger,
  type AssetsContractControllerMessenger,
} from '../messengers/assets-contract-controller-messenger';
import { ControllerInitRequest } from '../types';
import { assetsContractControllerInit } from './assets-contract-controller-init';
import { AssetsContractController } from '@metamask/assets-controllers';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<AssetsContractControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getAssetsContractControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  // @ts-expect-error: Partial mock.
  requestMock.getController.mockImplementation((name) => {
    if (name === 'NetworkController') {
      return {
        state: {
          selectedNetworkClientId: 'mainnet',
        },

        getNetworkClientById: jest
          .fn()
          .mockImplementation((networkClientId) => {
            if (networkClientId === 'mainnet') {
              return {
                configuration: {
                  chainId: '0x1',
                },
              };
            }

            throw new Error(`Network client "${networkClientId}" not found.`);
          }),
      };
    }

    throw new Error(`Controller "${name}" not found.`);
  });

  return requestMock;
}

describe('AssetsContractControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = assetsContractControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(AssetsContractController);
  });

  it('passes the proper arguments to the controller', () => {
    assetsContractControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AssetsContractController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      chainId: '0x1',
    });
  });
});
