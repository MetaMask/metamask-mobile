import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getMoneyAccountControllerMessenger } from '../messengers/money-account-controller-messenger';
import { MessengerClientInitRequest } from '../types';
import { moneyAccountControllerInit } from './money-account-controller-init';
import {
  MoneyAccountController,
  MoneyAccountControllerMessenger,
} from '@metamask/money-account-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/money-account-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<MoneyAccountControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMoneyAccountControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('moneyAccountControllerInit', () => {
  it('initializes the controller', () => {
    const { messengerClient } =
      moneyAccountControllerInit(getInitRequestMock());
    expect(messengerClient).toBeInstanceOf(MoneyAccountController);
  });

  it('passes the proper arguments to the controller', () => {
    moneyAccountControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(MoneyAccountController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
    });
  });
});
