import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getPhishingControllerMessenger } from './phishing-controller-messenger';
import { PhishingControllerMessenger } from '@metamask/phishing-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<PhishingControllerMessenger>,
  MessengerEvents<PhishingControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getPhishingControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const phishingControllerMessenger =
      getPhishingControllerMessenger(rootMessenger);

    expect(phishingControllerMessenger).toBeInstanceOf(Messenger);
  });
});
