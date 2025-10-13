import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getTokenListControllerMessenger,
  getTokenListControllerInitMessenger,
  type TokenListControllerMessenger,
  TokenListControllerInitMessenger,
} from '../messengers/token-list-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokenListControllerInit } from './token-list-controller-init';
import { TokenListController } from '@metamask/assets-controllers';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    TokenListControllerMessenger,
    TokenListControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getTokenListControllerMessenger(baseMessenger),
    initMessenger: getTokenListControllerInitMessenger(baseMessenger),
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

describe('tokenListControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = tokenListControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(TokenListController);
  });

  it('passes the proper arguments to the controller', () => {
    tokenListControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(TokenListController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      chainId: '0x1',
      onNetworkStateChange: expect.any(Function),
    });
  });
});
