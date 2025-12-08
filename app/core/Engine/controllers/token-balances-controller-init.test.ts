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
  it('initializes the controller', () => {
    const { controller } = tokenBalancesControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(TokenBalancesController);
  });

  it('passes the proper arguments to the controller', () => {
    tokenBalancesControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(TokenBalancesController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      interval: 30_000,
      allowExternalServices: expect.any(Function),
      queryMultipleAccounts: expect.any(Boolean),
      accountsApiChainIds: expect.any(Function),
    });
  });
});
