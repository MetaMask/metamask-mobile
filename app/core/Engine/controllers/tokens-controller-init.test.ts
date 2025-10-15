import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getTokensControllerMessenger,
  getTokensControllerInitMessenger,
  type TokensControllerMessenger,
  TokensControllerInitMessenger,
} from '../messengers/tokens-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokensControllerInit } from './tokens-controller-init';
import { TokensController } from '@metamask/assets-controllers';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    TokensControllerMessenger,
    TokensControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getTokensControllerMessenger(baseMessenger),
    initMessenger: getTokensControllerInitMessenger(baseMessenger),
  };

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Partial mock.
    'NetworkController:getSelectedNetworkClient',
    () => ({
      provider: {},
    }),
  );

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

describe('tokensControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = tokensControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(TokensController);
  });

  it('passes the proper arguments to the controller', () => {
    tokensControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(TokensController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      chainId: '0x1',
      provider: {},
    });
  });
});
