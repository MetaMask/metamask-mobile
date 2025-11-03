import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getAccountTrackerControllerMessenger } from './account-tracker-controller-messenger';
import { AccountTrackerControllerMessenger } from '@metamask/assets-controllers';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<AccountTrackerControllerMessenger>,
  MessengerEvents<AccountTrackerControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getAccountTrackerControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const accountTrackerControllerMessenger =
      getAccountTrackerControllerMessenger(rootMessenger);

    expect(accountTrackerControllerMessenger).toBeInstanceOf(Messenger);
  });
});
