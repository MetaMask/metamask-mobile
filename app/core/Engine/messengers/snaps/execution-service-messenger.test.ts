import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { ExecutionServiceMessenger } from '@metamask/snaps-controllers';
import { getExecutionServiceMessenger } from './execution-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<ExecutionServiceMessenger>,
  MessengerEvents<ExecutionServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });
describe('getExecutionServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const executionServiceMessenger =
      getExecutionServiceMessenger(rootMessenger);

    expect(executionServiceMessenger).toBeInstanceOf(Messenger);
  });
});
