import { getPredictControllerMessenger } from '.';
import { ExtendedMessenger } from '../../../ExtendedMessenger';

describe('PredictController Messenger', () => {
  it('returns an instance of the predict controller messenger', () => {
    const baseControllerMessenger = new ExtendedMessenger();

    const result = getPredictControllerMessenger(baseControllerMessenger);

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
