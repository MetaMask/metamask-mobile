import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getPermissionControllerMessenger,
  getPermissionControllerInitMessenger,
  PermissionControllerInitMessenger,
} from './permission-controller-messenger';
import { PermissionControllerMessenger } from '@metamask/permission-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<PermissionControllerMessenger>
  | MessengerActions<PermissionControllerInitMessenger>,
  | MessengerEvents<PermissionControllerMessenger>
  | MessengerEvents<PermissionControllerInitMessenger>
>;

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
