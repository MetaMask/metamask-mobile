import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getTokenListControllerMessenger,
  getTokenListControllerInitMessenger,
  TokenListControllerInitMessenger,
} from '../messengers/token-list-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokenListControllerInit } from './token-list-controller-init';
import {
  TokenListController,
  TokenListControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

const mockInitialize = jest.fn().mockResolvedValue(undefined);

jest.mock('@metamask/assets-controllers', () => {
  const MockTokenListController = jest.fn().mockImplementation(function (
    this: { initialize: jest.Mock },
  ) {
    this.initialize = mockInitialize;
  });
  return {
    TokenListController: MockTokenListController,
  };
});

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    TokenListControllerMessenger,
    TokenListControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('calls initialize on the controller', () => {
    tokenListControllerInit(getInitRequestMock());
    expect(mockInitialize).toHaveBeenCalled();
  });
});
