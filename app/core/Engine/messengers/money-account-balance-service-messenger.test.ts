import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { type MoneyAccountBalanceServiceMessenger } from '@metamask/money-account-balance-service';
import { getMoneyAccountBalanceServiceMessenger } from './money-account-balance-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<MoneyAccountBalanceServiceMessenger>,
  MessengerEvents<MoneyAccountBalanceServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getMoneyAccountBalanceServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger = getRootMessenger();

    const serviceMessenger =
      getMoneyAccountBalanceServiceMessenger(rootMessenger);

    expect(serviceMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates the two NetworkController actions to the scoped messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getMoneyAccountBalanceServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'NetworkController:getNetworkConfigurationByChainId',
          'NetworkController:getNetworkClientById',
        ]),
      }),
    );
  });
});
