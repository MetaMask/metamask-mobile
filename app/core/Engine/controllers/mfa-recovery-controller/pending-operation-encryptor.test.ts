import type { PendingOperation } from '@metamask/mfa-recovery-controller';
import { createKeyringPendingOperationEncryptor } from './pending-operation-encryptor';

const mockImportKey = jest.fn();
const mockEncryptWithKey = jest.fn();
const mockDecryptWithKey = jest.fn();

jest.mock('../../../Encryptor', () => ({
  Encryptor: jest.fn(() => ({
    importKey: mockImportKey,
    encryptWithKey: mockEncryptWithKey,
    decryptWithKey: mockDecryptWithKey,
  })),
  LEGACY_DERIVATION_OPTIONS: {
    algorithm: 'PBKDF2',
    params: { iterations: 5000 },
  },
}));

const pendingOperation = {
  phase: 'authorizing' as const,
  mutation: {
    id: 'mutation-1',
    profileId: 'profile-1',
    operation: 'register' as const,
    expectedVersion: 0,
    newVersion: 1,
    payloadHash: '0xpayload',
    audiences: ['cubist'],
    requestHash: '0xrequest',
  },
  identifier: null,
  payload: {
    identifiers: [],
    recoverySecret: '0xsecret',
  },
} satisfies PendingOperation;

describe('createKeyringPendingOperationEncryptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportKey.mockResolvedValue('imported-key');
    mockEncryptWithKey.mockResolvedValue({
      cipher: 'ciphertext',
      iv: 'iv',
      keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 5000 } },
      lib: 'quick-crypto',
    });
    mockDecryptWithKey.mockResolvedValue(pendingOperation);
  });

  it('encrypts pending operations using the exported keyring key', async () => {
    const encryptor = createKeyringPendingOperationEncryptor({
      exportEncryptionKey: jest.fn().mockResolvedValue('exported-key'),
    });

    await expect(encryptor.encrypt(pendingOperation)).resolves.toBe(
      JSON.stringify({
        cipher: 'ciphertext',
        iv: 'iv',
        keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 5000 } },
        lib: 'quick-crypto',
      }),
    );
    expect(mockImportKey).toHaveBeenCalledWith('exported-key');
    expect(mockEncryptWithKey).toHaveBeenCalledWith(
      'imported-key',
      pendingOperation,
    );
  });

  it('decrypts pending operations using the exported keyring key', async () => {
    const encryptor = createKeyringPendingOperationEncryptor({
      exportEncryptionKey: jest.fn().mockResolvedValue('exported-key'),
    });
    const ciphertext = JSON.stringify({ cipher: 'ciphertext' });

    await expect(encryptor.decrypt(ciphertext)).resolves.toEqual(
      pendingOperation,
    );
    expect(mockImportKey).toHaveBeenCalledWith('exported-key');
    expect(mockDecryptWithKey).toHaveBeenCalledWith('imported-key', {
      cipher: 'ciphertext',
    });
  });
});
