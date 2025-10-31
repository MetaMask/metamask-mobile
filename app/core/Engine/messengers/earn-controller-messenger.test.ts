import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getEarnControllerMessenger,
  getEarnControllerInitMessenger,
  EarnControllerInitMessenger,
} from './earn-controller-messenger';
import { EarnControllerMessenger } from '@metamask/earn-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<EarnControllerMessenger>
  | MessengerActions<EarnControllerInitMessenger>,
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

describe('getEarnControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const earnControllerInitMessenger =
      getEarnControllerInitMessenger(rootMessenger);

    expect(earnControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});
