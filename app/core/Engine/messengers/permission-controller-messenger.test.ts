import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import {
  getPermissionControllerMessenger,
  getPermissionControllerInitMessenger,
} from './permission-controller-messenger';
import { RootMessenger } from '../types';

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getPermissionControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const permissionControllerMessenger =
      getPermissionControllerMessenger(rootMessenger);

    expect(permissionControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getPermissionControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const permissionControllerInitMessenger =
      getPermissionControllerInitMessenger(rootMessenger);

    expect(permissionControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});
