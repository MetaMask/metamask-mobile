import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { RampsServiceMessenger } from '@metamask/ramps-controller';
import { getRampsServiceMessenger } from './ramps-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<RampsServiceMessenger>,
  MessengerEvents<RampsServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getRampsServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const rampsServiceMessenger = getRampsServiceMessenger(rootMessenger);

    expect(rampsServiceMessenger).toBeInstanceOf(Messenger);
  });
});
