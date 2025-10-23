import { getPerpsControllerMessenger } from '.';
import { ExtendedMessenger } from '../../../ExtendedMessenger';

describe('PerpsController Messenger', () => {
  it('returns an instance of the perps controller messenger', () => {
    const baseControllerMessenger = new ExtendedMessenger();

    const result = getPerpsControllerMessenger(baseControllerMessenger);

    const expectedMethods = [
      'call',
      'clearEventSubscriptions',
      'publish',
      'registerActionHandler',
      'registerInitialEventPayload',
      'subscribe',
      'unregisterActionHandler',
      'unsubscribe',
    ] as const;

    expectedMethods.forEach((method) => {
      expect(typeof result[method]).toBe('function');
    });
  });
});
