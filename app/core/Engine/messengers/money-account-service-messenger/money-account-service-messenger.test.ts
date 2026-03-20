import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { MoneyAccountServiceMessenger } from '@metamask-previews/money-account-service';
import { getMoneyAccountServiceMessenger } from './money-account-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<MoneyAccountServiceMessenger>,
  MessengerEvents<MoneyAccountServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getMoneyAccountServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const moneyAccountServiceMessenger =
      getMoneyAccountServiceMessenger(rootMessenger);

    expect(moneyAccountServiceMessenger).toBeInstanceOf(Messenger);
  });
});
