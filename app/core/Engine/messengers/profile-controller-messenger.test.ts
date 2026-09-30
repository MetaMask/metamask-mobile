import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { ProfileControllerMessenger } from '@metamask/profile-controller';
import { getProfileControllerMessenger } from './profile-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<ProfileControllerMessenger>,
  MessengerEvents<ProfileControllerMessenger>
>;

describe('getProfileControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });

    expect(getProfileControllerMessenger(rootMessenger)).toBeInstanceOf(
      Messenger,
    );
  });
});
