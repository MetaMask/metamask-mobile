import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getMultichainRoutingServiceMessenger,
  getMultichainRoutingServiceInitMessenger,
  MultichainRoutingServiceInitMessenger,
} from './multichain-routing-service-messenger.ts';
import { MultichainRoutingServiceMessenger } from '@metamask/snaps-controllers';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<MultichainRoutingServiceMessenger>
  | MessengerActions<MultichainRoutingServiceInitMessenger>,
  | MessengerEvents<MultichainRoutingServiceMessenger>
  | MessengerEvents<MultichainRoutingServiceInitMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getMultichainRoutingServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const messenger = getMultichainRoutingServiceMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});

describe('getMultichainRoutingServiceInitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const messenger = getMultichainRoutingServiceInitMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});
