import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { getErrorReportingServiceMessenger } from './error-reporting-service-messenger';
import { ErrorReportingServiceMessenger } from '@metamask/error-reporting-service';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<ErrorReportingServiceMessenger>,
  MessengerEvents<ErrorReportingServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getErrorReportingServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const errorReportingServiceMessenger =
      getErrorReportingServiceMessenger(rootMessenger);

    expect(errorReportingServiceMessenger).toBeInstanceOf(Messenger);
  });
});
