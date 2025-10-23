import { RestrictedMessenger } from '@metamask/base-controller';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getAccountActivityServiceMessenger } from './account-activity-service-messenger';

describe('getAccountActivityServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    // Arrange
    const messenger = new ExtendedMessenger<never, never>();

    // Act
    const accountActivityServiceMessenger =
      getAccountActivityServiceMessenger(messenger);

    // Assert
    expect(accountActivityServiceMessenger).toBeInstanceOf(RestrictedMessenger);
  });

  it('allows required actions and events', () => {
    // Arrange
    const messenger = new ExtendedMessenger<never, never>();

    // Act & Assert - no error means messenger is configured correctly
    expect(() => getAccountActivityServiceMessenger(messenger)).not.toThrow();
  });
});
