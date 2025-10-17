import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getPermissionControllerMessenger,
  getPermissionControllerInitMessenger,
} from './permission-controller-messenger';

describe('getPermissionControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const permissionControllerMessenger =
      getPermissionControllerMessenger(messenger);

    expect(permissionControllerMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

describe('getPermissionControllerInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const permissionControllerInitMessenger =
      getPermissionControllerInitMessenger(messenger);

    expect(permissionControllerInitMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});
