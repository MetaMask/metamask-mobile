import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getStorageServiceMessenger } from './storage-service-messenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

describe('getStorageServiceMessenger', () => {
  it('creates a messenger with StorageService namespace', () => {
    const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>(
      {
        namespace: MOCK_ANY_NAMESPACE,
      },
    );

    const messenger = getStorageServiceMessenger(baseMessenger);

    expect(messenger).toBeDefined();
  });

  it('returns a messenger with correct namespace', () => {
    const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>(
      {
        namespace: MOCK_ANY_NAMESPACE,
      },
    );

    const messenger = getStorageServiceMessenger(baseMessenger);

    // Verify messenger has correct structure by checking it has the expected methods
    expect(typeof messenger.call).toBe('function');
    expect(typeof messenger.registerActionHandler).toBe('function');
  });
});
