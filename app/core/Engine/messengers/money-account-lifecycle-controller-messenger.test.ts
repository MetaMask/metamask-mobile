import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { MoneyAccountLifecycleControllerMessenger } from '@metamask/money-account-lifecycle-controller';
import { getMoneyAccountLifecycleControllerMessenger } from './money-account-lifecycle-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<MoneyAccountLifecycleControllerMessenger>,
  MessengerEvents<MoneyAccountLifecycleControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getMoneyAccountLifecycleControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger = getRootMessenger();

    const messenger =
      getMoneyAccountLifecycleControllerMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});
