import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { TokenDetectionControllerMessenger } from '@metamask/assets-controllers';
import {
  getTokenDetectionControllerMessenger,
  getTokenDetectionControllerInitMessenger,
  TokenDetectionControllerInitMessenger,
} from './token-detection-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<TokenDetectionControllerMessenger>
  | MessengerActions<TokenDetectionControllerInitMessenger>,
  | MessengerEvents<TokenDetectionControllerMessenger>
  | MessengerEvents<TokenDetectionControllerInitMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getTokenDetectionControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenDetectionControllerMessenger =
      getTokenDetectionControllerMessenger(messenger);

    expect(tokenDetectionControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getTokenDetectionControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenDetectionControllerInitMessenger =
      getTokenDetectionControllerInitMessenger(messenger);

    expect(tokenDetectionControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});
