import { createPendingOperationEncryptor } from './pending-operation-encryptor';

const mockEncryptWithKey = jest.fn();
const mockDecryptWithKey = jest.fn();
const mockGenerateSalt = jest.fn();
const mockKeyFromPassword = jest.fn();

jest.mock('../../../Encryptor', () => ({
  DERIVATION_OPTIONS_MINIMUM_OWASP2023: { algorithm: 'PBKDF2' },
  Encryptor: jest.fn().mockImplementation(() => ({
    encryptWithKey: mockEncryptWithKey,
    decryptWithKey: mockDecryptWithKey,
    generateSalt: mockGenerateSalt,
    keyFromPassword: mockKeyFromPassword,
  })),
}));

describe('createPendingOperationEncryptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateSalt
      .mockReturnValueOnce('salt-a')
      .mockReturnValueOnce('salt-b');
    mockKeyFromPassword.mockResolvedValue({ key: 'material' });
    mockEncryptWithKey.mockResolvedValue({ cipher: 'c', iv: 'i' });
    mockDecryptWithKey.mockResolvedValue({ operation: 'register' });
  });

  it('encrypts and decrypts with one in-memory key', async () => {
    const encryptor = createPendingOperationEncryptor();
    const operation = { operation: 'register' } as never;

    const ciphertext = await encryptor.encrypt(operation);
    const decrypted = await encryptor.decrypt(ciphertext);

    expect(ciphertext).toBe(JSON.stringify({ cipher: 'c', iv: 'i' }));
    expect(decrypted).toStrictEqual({ operation: 'register' });
    expect(mockKeyFromPassword).toHaveBeenCalledTimes(1);
    expect(mockKeyFromPassword).toHaveBeenCalledWith('salt-a', 'salt-b');
    expect(mockEncryptWithKey).toHaveBeenCalledWith(
      { key: 'material' },
      operation,
    );
    expect(mockDecryptWithKey).toHaveBeenCalledWith(
      { key: 'material' },
      { cipher: 'c', iv: 'i' },
    );
  });
});
