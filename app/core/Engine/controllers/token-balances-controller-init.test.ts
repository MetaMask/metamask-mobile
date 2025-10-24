import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getTokenBalancesControllerInitMessenger,
  getTokenBalancesControllerMessenger,
  TokenBalancesControllerInitMessenger,
  type TokenBalancesControllerMessenger,
} from '../messengers/token-balances-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokenBalancesControllerInit } from './token-balances-controller-init';
import { TokenBalancesController } from '@metamask/assets-controllers';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    TokenBalancesControllerMessenger,
    TokenBalancesControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<never, never>();

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
      interval: 180_000,
      allowExternalServices: expect.any(Function),
      queryMultipleAccounts: expect.any(Boolean),
      accountsApiChainIds: expect.any(Function),
    });
  });
});
