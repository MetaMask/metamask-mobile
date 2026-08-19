import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { SocialServiceMessenger } from '@metamask/social-controllers';
import { getSocialServiceMessenger } from './social-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SocialServiceMessenger>,
  MessengerEvents<SocialServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getSocialServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const socialServiceMessenger = getSocialServiceMessenger(rootMessenger);

    expect(socialServiceMessenger).toBeInstanceOf(Messenger);
  });
});
