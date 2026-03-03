import { MOCK_ANY_NAMESPACE, Messenger } from '@metamask/messenger';
import { getProfileMetricsControllerMessenger } from './profile-metrics-controller-messenger';
import { RootMessenger } from '../types';

const getRootMessenger = () =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getProfileMetricsControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const profileMetricsControllerMessenger =
      getProfileMetricsControllerMessenger(
        // TODO: Remove this cast once accounts controller package is added in
        messenger as unknown as RootMessenger,
      );

    expect(profileMetricsControllerMessenger).toBeInstanceOf(Messenger);
  });
});
