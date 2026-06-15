import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { SnapKeyringBuilderMessenger } from '../SnapKeyring/types';
import { getSnapKeyringBuilderV2Messenger } from './snap-keyring-builder-v2-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SnapKeyringBuilderMessenger>,
  MessengerEvents<SnapKeyringBuilderMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSnapKeyringBuilderV2Messenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const messenger = getSnapKeyringBuilderV2Messenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});
