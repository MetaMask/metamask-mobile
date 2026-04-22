import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getMoneyAccountControllerMessenger } from './money-account-controller-messenger';
import { MoneyAccountControllerMessenger } from '@metamask/money-account-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<MoneyAccountControllerMessenger>,
  MessengerEvents<MoneyAccountControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getMoneyAccountControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const moneyAccountControllerMessenger =
      getMoneyAccountControllerMessenger(rootMessenger);

    expect(moneyAccountControllerMessenger).toBeInstanceOf(Messenger);
  });
});
