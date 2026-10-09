import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getSnapInterfaceControllerMessenger } from './snap-interface-controller-messenger';
import { RootMessenger } from '../../types';

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSnapInterfaceControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const snapInterfaceControllerMessenger =
      getSnapInterfaceControllerMessenger(rootMessenger);

    expect(snapInterfaceControllerMessenger).toBeInstanceOf(Messenger);
  });
});
