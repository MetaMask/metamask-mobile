import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import {
  getBackendWebSocketServiceInitMessenger,
  getBackendWebSocketServiceMessenger,
} from './backend-websocket-service-messenger';
import { BackendWebSocketServiceMessenger } from '@metamask/core-backend';
import { ExtendedMessenger } from '../../../ExtendedMessenger';

type RootMessenger = ExtendedMessenger<
  MockAnyNamespace,
  MessengerActions<BackendWebSocketServiceMessenger>,
  MessengerEvents<BackendWebSocketServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new ExtendedMessenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getBackendWebSocketServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const backendWebSocketServiceMessenger =
      getBackendWebSocketServiceMessenger(rootMessenger);

    // Assert
    expect(backendWebSocketServiceMessenger).toBeInstanceOf(Messenger);
  });

  it('allows required actions and events', () => {
    const rootMessenger = getRootMessenger();
    expect(() =>
      getBackendWebSocketServiceMessenger(rootMessenger),
    ).not.toThrow();
  });
});

describe('getBackendWebSocketServiceInitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();

    const backendWebSocketServiceInitMessenger =
      getBackendWebSocketServiceInitMessenger(rootMessenger);

    expect(backendWebSocketServiceInitMessenger).toBeInstanceOf(Messenger);
  });
  it('allows required actions', () => {
    const rootMessenger = getRootMessenger();

    expect(() =>
      getBackendWebSocketServiceInitMessenger(rootMessenger),
    ).not.toThrow();
  });
});
