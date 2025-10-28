import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getRemoteFeatureFlagControllerMessenger } from './remote-feature-flag-controller-messenger';

describe('getRemoteFeatureFlagControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const remoteFeatureFlagControllerMessenger =
      getRemoteFeatureFlagControllerMessenger(messenger);

    expect(remoteFeatureFlagControllerMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});
