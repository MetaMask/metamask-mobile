import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import {
  getSnapKeyringBuilderMessenger,
  getSnapKeyringBuilderInitMessenger,
  SnapKeyringBuilderInitMessenger,
} from './snap-keyring-builder-messenger';
import { SnapKeyringBuilderMessenger } from '../../SnapKeyring/types';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<SnapKeyringBuilderMessenger>
  | MessengerActions<SnapKeyringBuilderInitMessenger>,
  | MessengerEvents<SnapKeyringBuilderMessenger>
  | MessengerEvents<SnapKeyringBuilderInitMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSnapKeyringBuilderMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const snapKeyringBuilderMessenger =
      getSnapKeyringBuilderMessenger(messenger);

    expect(snapKeyringBuilderMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getSnapKeyringBuilderInitMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const snapKeyringBuilderInitMessenger =
      getSnapKeyringBuilderInitMessenger(messenger);

    expect(snapKeyringBuilderInitMessenger).toBeInstanceOf(Messenger);
  });
});
