import { getEarnControllerMessenger } from '.';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

describe('EarnController Messenger', () => {
  it('returns an instance of the earn controller messenger', () => {
    const baseControllerMessenger = new ExtendedControllerMessenger();

    const result = getEarnControllerMessenger(baseControllerMessenger);

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
