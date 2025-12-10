import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getAssetsContractControllerMessenger } from '../messengers/assets-contract-controller-messenger';
import { ControllerInitRequest } from '../types';
import { assetsContractControllerInit } from './assets-contract-controller-init';
import {
  AssetsContractController,
  type AssetsContractControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<AssetsContractControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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
