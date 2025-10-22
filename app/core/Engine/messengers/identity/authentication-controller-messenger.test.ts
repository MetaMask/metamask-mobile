import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getAuthenticationControllerMessenger } from './authentication-controller-messenger';

describe('getAuthenticationControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const AuthenticationControllerMessenger =
      getAuthenticationControllerMessenger(messenger);

    expect(AuthenticationControllerMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});
