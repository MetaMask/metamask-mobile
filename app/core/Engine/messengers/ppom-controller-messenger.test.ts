import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { PPOMControllerMessenger } from '@metamask/ppom-validator';
import {
  getPPOMControllerMessenger,
  getPPOMControllerInitMessenger,
  PPOMControllerInitMessenger,
} from './ppom-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<PPOMControllerMessenger>
  | MessengerActions<PPOMControllerInitMessenger>,
  | MessengerEvents<PPOMControllerMessenger>
  | MessengerEvents<PPOMControllerInitMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getPPOMControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const ppomControllerMessenger = getPPOMControllerMessenger(rootMessenger);

    expect(ppomControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getPPOMControllerInitializationMessenger', () => {
  it('returns a messenger for initialization', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const ppomControllerInitMessenger =
      getPPOMControllerInitMessenger(rootMessenger);

    expect(ppomControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});
