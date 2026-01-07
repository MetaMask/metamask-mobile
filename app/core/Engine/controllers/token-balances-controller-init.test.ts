import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getTokenBalancesControllerInitMessenger,
  getTokenBalancesControllerMessenger,
  TokenBalancesControllerInitMessenger,
} from '../messengers/token-balances-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokenBalancesControllerInit } from './token-balances-controller-init';
import {
  TokenBalancesController,
  TokenBalancesControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    TokenBalancesControllerMessenger,
    TokenBalancesControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getTokenBalancesControllerMessenger(baseMessenger),
    initMessenger: getTokenBalancesControllerInitMessenger(baseMessenger),
  };

  // @ts-expect-error: Partial mock.
  baseMessenger.registerActionHandler('PreferencesController:getState', () => ({
    isMultiAccountBalancesEnabled: true,
  }));

  return requestMock;
}

describe('TokenBalancesControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    const { controller } = tokenBalancesControllerInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(TokenBalancesController);
  });

  it('passes the persisted state to the controller when available', () => {
    const mockPersistedState = {
      tokenBalances: {
        '0x123': {
          '0x1': {
            '0xtoken': '0x100' as const,
          },
        },
      },
    } as const;
    const requestMock = getInitRequestMock();
    requestMock.persistedState.TokenBalancesController = mockPersistedState;

    tokenBalancesControllerInit(requestMock);

    const controllerMock = jest.mocked(TokenBalancesController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: mockPersistedState,
      interval: 30_000,
      allowExternalServices: expect.any(Function),
      queryMultipleAccounts: expect.any(Boolean),
      accountsApiChainIds: expect.any(Function),
      platform: 'mobile',
      isOnboarded: expect.any(Function),
    });
  });

  it('uses default state with empty tokenBalances when persisted state is undefined', () => {
    const requestMock = getInitRequestMock();
    requestMock.persistedState.TokenBalancesController = undefined;

    tokenBalancesControllerInit(requestMock);

    const controllerMock = jest.mocked(TokenBalancesController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: { tokenBalances: {} },
      interval: 30_000,
      allowExternalServices: expect.any(Function),
      queryMultipleAccounts: expect.any(Boolean),
      accountsApiChainIds: expect.any(Function),
      platform: 'mobile',
      isOnboarded: expect.any(Function),
    });
  });

  it('uses default state with empty tokenBalances when persistedState is null', () => {
    const requestMock = getInitRequestMock();
    // @ts-expect-error: Testing null case
    requestMock.persistedState = null;

    tokenBalancesControllerInit(requestMock);

    const controllerMock = jest.mocked(TokenBalancesController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: { tokenBalances: {} },
      interval: 30_000,
      allowExternalServices: expect.any(Function),
      queryMultipleAccounts: expect.any(Boolean),
      accountsApiChainIds: expect.any(Function),
      platform: 'mobile',
      isOnboarded: expect.any(Function),
    });
  });
});
