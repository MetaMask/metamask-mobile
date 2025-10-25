import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getPreferencesControllerMessenger } from './preferences-controller-messenger';
import { PreferencesControllerMessenger } from '@metamask/preferences-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<PreferencesControllerMessenger>,
  MessengerEvents<PreferencesControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getPreferencesControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const preferencesControllerMessenger =
      getPreferencesControllerMessenger(rootMessenger);

    expect(preferencesControllerMessenger).toBeInstanceOf(Messenger);
  });
});
