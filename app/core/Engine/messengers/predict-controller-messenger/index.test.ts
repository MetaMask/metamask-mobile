import { getPredictControllerMessenger } from '.';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

describe('PredictController Messenger', () => {
  it('returns an instance of the predict controller messenger', () => {
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

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

  it('delegates subscription benefits lookup to the scoped messenger', () => {
    const rootMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getPredictControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining(['SubscriptionController:getBenefits']),
      }),
    );
  });
});
