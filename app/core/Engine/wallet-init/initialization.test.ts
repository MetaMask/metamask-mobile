import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { Wallet } from '@metamask/wallet';
import { initializeWallet } from './initialization';
import { getKeyringBuilders, getKeyringV2Builders } from './keyrings';

jest.mock('@metamask/wallet', () => ({
  Wallet: jest.fn(),
}));

jest.mock('./keyrings', () => ({
  getKeyringBuilders: jest.fn(() => ['v1-builder']),
  getKeyringV2Builders: jest.fn(() => ['v2-builder']),
  qrKeyringBridge: {},
}));

jest.mock('../utils/storage-service-utils', () => ({
  mobileStorageAdapter: { name: 'mock-storage-adapter' },
}));

describe('initializeWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs a Wallet with the configured encryptor, V1 and V2 builders, and storage adapter', () => {
    const messenger = new Messenger<MockAnyNamespace, never, never>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const state = { KeyringController: { vault: 'encrypted-vault-blob' } };

    initializeWallet({ messenger, state });

    expect(getKeyringBuilders).toHaveBeenCalledWith(messenger);
    expect(getKeyringV2Builders).toHaveBeenCalled();
    expect(Wallet).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger,
        state,
        instanceOptions: expect.objectContaining({
          keyringController: expect.objectContaining({
            keyringBuilders: ['v1-builder'],
            keyringV2Builders: ['v2-builder'],
            encryptor: expect.any(Object),
          }),
          storageService: expect.objectContaining({
            storage: expect.objectContaining({ name: 'mock-storage-adapter' }),
          }),
        }),
      }),
    );
  });
});
