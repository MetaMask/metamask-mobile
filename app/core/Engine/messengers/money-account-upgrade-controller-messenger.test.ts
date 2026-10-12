import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { MoneyAccountUpgradeControllerMessenger } from '@metamask/money-account-upgrade-controller';
import { getMoneyAccountUpgradeControllerMessenger } from './money-account-upgrade-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<MoneyAccountUpgradeControllerMessenger>,
  MessengerEvents<MoneyAccountUpgradeControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getMoneyAccountUpgradeControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const moneyAccountUpgradeControllerMessenger =
      getMoneyAccountUpgradeControllerMessenger(rootMessenger);

    expect(moneyAccountUpgradeControllerMessenger).toBeInstanceOf(Messenger);
  });
});
