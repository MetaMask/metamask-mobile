import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  MessengerActions,
  MessengerEvents,
  MockAnyNamespace,
} from '@metamask/messenger';
import { getProfileMetricsServiceMessenger } from './profile-metrics-service-messenger';
import { ProfileMetricsServiceMessenger } from '@metamask/profile-metrics-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<ProfileMetricsServiceMessenger>,
  MessengerEvents<ProfileMetricsServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getProfileMetricsServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const userProfileServiceMessenger =
      getProfileMetricsServiceMessenger(messenger);

    expect(userProfileServiceMessenger).toBeInstanceOf(Messenger);
  });
});
