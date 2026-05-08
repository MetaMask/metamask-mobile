import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getMoneyAccountBalanceServiceMessenger } from '../messengers/money-account-balance-service-messenger';
import { MessengerClientInitRequest } from '../types';
import { moneyAccountBalanceServiceInit } from './money-account-balance-service-init';
import {
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceMessenger,
} from '@metamask/money-account-balance-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/money-account-balance-service');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<MoneyAccountBalanceServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMoneyAccountBalanceServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('moneyAccountBalanceServiceInit', () => {
  it('returns a MoneyAccountBalanceService instance', () => {
    const { controller } = moneyAccountBalanceServiceInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(MoneyAccountBalanceService);
  });

  it('passes messenger to the service', () => {
    moneyAccountBalanceServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(MoneyAccountBalanceService);
    expect(serviceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
      }),
    );
  });
});
