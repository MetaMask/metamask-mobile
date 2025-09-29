import { getPredictControllerMessenger } from '.';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

describe('PredictController Messenger', () => {
  it('returns an instance of the predict controller messenger', () => {
    const baseControllerMessenger = new ExtendedControllerMessenger();

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
