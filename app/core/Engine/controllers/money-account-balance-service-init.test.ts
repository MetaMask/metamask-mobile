import { CHAIN_IDS } from '@metamask/transaction-controller';
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

  it('passes vault configuration and messenger to the service', () => {
    moneyAccountBalanceServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(MoneyAccountBalanceService);
    expect(serviceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
        vaultAddress: '0xB5F07d769dD60fE54c97dd53101181073DDf21b2',
        vaultChainId: CHAIN_IDS.ARBITRUM,
        accountantAddress: '0x800ebc3B74F67EaC27C9CCE4E4FF28b17CdCA173',
        underlyingTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        underlyingTokenDecimals: 6,
      }),
    );
  });
});
