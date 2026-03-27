import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getMoneyAccountServiceMessenger } from './money-account-service-messenger';
import { MoneyAccountServiceMessenger } from '../../controllers/money-account-service';

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
