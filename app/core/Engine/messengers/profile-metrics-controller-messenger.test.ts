import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  MessengerActions,
  MessengerEvents,
  MockAnyNamespace,
} from '@metamask/messenger';
import { getProfileMetricsControllerMessenger } from './profile-metrics-controller-messenger';
import { ProfileMetricsControllerMessenger } from '@metamask/profile-metrics-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<ProfileMetricsControllerMessenger>,
  MessengerEvents<ProfileMetricsControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getProfileMetricsControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const profileMetricsControllerMessenger =
      getProfileMetricsControllerMessenger(messenger);

    expect(profileMetricsControllerMessenger).toBeInstanceOf(Messenger);
  });
});
