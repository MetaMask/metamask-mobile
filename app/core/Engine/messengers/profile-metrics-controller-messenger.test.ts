import { MOCK_ANY_NAMESPACE, Messenger } from '@metamask/messenger';
import { getProfileMetricsControllerMessenger } from './profile-metrics-controller-messenger';

const getRootMessenger = () =>
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
