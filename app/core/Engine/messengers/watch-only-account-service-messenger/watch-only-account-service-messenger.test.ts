import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { WatchOnlyAccountServiceMessenger } from '@metamask/watch-only-account-service';
import { getWatchOnlyAccountServiceMessenger } from './watch-only-account-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<WatchOnlyAccountServiceMessenger>,
  MessengerEvents<WatchOnlyAccountServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getWatchOnlyAccountServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();

    const messenger = getWatchOnlyAccountServiceMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });

  it('delegates only the KeyringController actions the service calls', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getWatchOnlyAccountServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: [
          'KeyringController:withController',
          'KeyringController:withKeyringV2',
        ],
      }),
    );
  });
});
