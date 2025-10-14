import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getUserStorageControllerMessenger } from './user-storage-controller-messenger';

describe('getUserStorageControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const UserStorageControllerMessenger =
      getUserStorageControllerMessenger(messenger);

    expect(UserStorageControllerMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});
