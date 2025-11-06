import { getPerpsControllerMessenger } from '.';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

describe('PerpsController Messenger', () => {
  it('returns an instance of the perps controller messenger', () => {
    const baseControllerMessenger = new ExtendedControllerMessenger();

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
