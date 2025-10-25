import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { SmartTransactionsControllerMessenger } from '@metamask/smart-transactions-controller';
import { getSmartTransactionsControllerMessenger } from './smart-transactions-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SmartTransactionsControllerMessenger>,
  MessengerEvents<SmartTransactionsControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
describe('getSmartTransactionsControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const smartTransactionsControllerMessenger =
      getSmartTransactionsControllerMessenger(messenger);

    expect(smartTransactionsControllerMessenger).toBeInstanceOf(Messenger);
  });
});
