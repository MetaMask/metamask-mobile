import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { WebSocketServiceMessenger } from '@metamask/snaps-controllers';
import { getWebSocketServiceMessenger } from './websocket-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<WebSocketServiceMessenger>,
  MessengerEvents<WebSocketServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getWebSocketServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const websocketServiceMessenger =
      getWebSocketServiceMessenger(rootMessenger);

    expect(websocketServiceMessenger).toBeInstanceOf(Messenger);
  });
});
