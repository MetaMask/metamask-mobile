import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getLoggingControllerMessenger } from './logging-controller-messenger';
import { LoggingControllerMessenger } from '@metamask/logging-controller';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<LoggingControllerMessenger>,
  MessengerEvents<LoggingControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}
describe('getLoggingControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const loggingControllerMessenger =
      getLoggingControllerMessenger(rootMessenger);

    expect(loggingControllerMessenger).toBeInstanceOf(Messenger);
  });
});
