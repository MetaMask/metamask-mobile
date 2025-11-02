import { RestrictedMessenger } from '@metamask/base-controller';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import {
  getBackendWebSocketServiceMessenger,
  getBackendWebSocketServiceInitMessenger,
} from './backend-websocket-service-messenger';

describe('getBackendWebSocketServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    // Arrange
    const messenger = new ExtendedControllerMessenger<never, never>();

    // Act
    const backendWebSocketServiceMessenger =
      getBackendWebSocketServiceMessenger(messenger);

    // Assert
    expect(backendWebSocketServiceMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });

  it('allows required actions and events', () => {
    // Arrange
    const messenger = new ExtendedControllerMessenger<never, never>();

    // Act & Assert - no error means messenger is configured correctly
    expect(() => getBackendWebSocketServiceMessenger(messenger)).not.toThrow();
  });
});

describe('getBackendWebSocketServiceInitMessenger', () => {
  it('returns a restricted messenger', () => {
    // Arrange
    const messenger = new ExtendedControllerMessenger<never, never>();

    // Act
    const backendWebSocketServiceInitMessenger =
      getBackendWebSocketServiceInitMessenger(messenger);

    // Assert
    expect(backendWebSocketServiceInitMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });

  it('allows required actions', () => {
    // Arrange
    const messenger = new ExtendedControllerMessenger<never, never>();

    // Act & Assert - no error means messenger is configured correctly
    expect(() =>
      getBackendWebSocketServiceInitMessenger(messenger),
    ).not.toThrow();
  });
});
