import { getQrSyncControllerMessenger } from '.';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

describe('QrSyncController Messenger', () => {
  it('returns an instance of the QR sync controller messenger', () => {
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

    const result = getQrSyncControllerMessenger(baseControllerMessenger);

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
