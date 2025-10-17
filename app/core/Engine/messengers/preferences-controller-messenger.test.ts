import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getPreferencesControllerMessenger } from './preferences-controller-messenger';

describe('getPreferencesControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const preferencesControllerMessenger =
      getPreferencesControllerMessenger(messenger);

    expect(preferencesControllerMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});
