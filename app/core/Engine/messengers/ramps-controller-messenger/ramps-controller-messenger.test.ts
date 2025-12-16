import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { RampsControllerMessenger } from '@metamask/ramps-controller';
import { getRampsControllerMessenger } from './ramps-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<RampsControllerMessenger>,
  MessengerEvents<RampsControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getRampsControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const rampsControllerMessenger = getRampsControllerMessenger(rootMessenger);

    expect(rampsControllerMessenger).toBeInstanceOf(Messenger);
  });
});
