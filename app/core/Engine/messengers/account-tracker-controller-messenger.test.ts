import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getAccountTrackerControllerMessenger } from './account-tracker-controller-messenger';

describe('getAccountTrackerControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const accountTrackerControllerMessenger =
      getAccountTrackerControllerMessenger(messenger);

    expect(accountTrackerControllerMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});
