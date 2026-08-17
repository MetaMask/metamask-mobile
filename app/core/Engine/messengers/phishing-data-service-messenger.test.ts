import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getPhishingDataServiceMessenger } from './phishing-data-service-messenger';
import { PhishingDataServiceMessenger } from '@metamask/phishing-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<PhishingDataServiceMessenger>,
  MessengerEvents<PhishingDataServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getPhishingDataServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const phishingDataServiceMessenger =
      getPhishingDataServiceMessenger(rootMessenger);

    expect(phishingDataServiceMessenger).toBeInstanceOf(Messenger);
  });
});
