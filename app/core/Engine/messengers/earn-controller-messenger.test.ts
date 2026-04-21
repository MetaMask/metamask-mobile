import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getEarnControllerMessenger } from './earn-controller-messenger';
import { EarnControllerMessenger } from '@metamask/earn-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<EarnControllerMessenger>,
  MessengerEvents<EarnControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getEarnControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const earnControllerMessenger = getEarnControllerMessenger(rootMessenger);

    expect(earnControllerMessenger).toBeInstanceOf(Messenger);
  });
});
