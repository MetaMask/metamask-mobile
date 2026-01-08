import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { MultichainAccountServiceMessenger } from '@metamask/multichain-account-service';
import { getMultichainAccountServiceMessenger } from './multichain-account-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<MultichainAccountServiceMessenger>,
  MessengerEvents<MultichainAccountServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getMultichainAccountServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const multichainAccountServiceMessenger =
      getMultichainAccountServiceMessenger(rootMessenger);

    expect(multichainAccountServiceMessenger).toBeInstanceOf(Messenger);
  });
});
