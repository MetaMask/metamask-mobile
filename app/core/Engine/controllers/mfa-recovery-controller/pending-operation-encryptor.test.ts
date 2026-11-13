import {
  createPendingOperationEncryptor,
  createPendingOperationKeyGetter,
} from './pending-operation-encryptor';

const mockImportKey = jest.fn();
const mockEncryptWithKey = jest.fn();
const mockDecryptWithKey = jest.fn();
const mockGenerateSalt = jest.fn();
const mockKeyFromPassword = jest.fn();
const mockExportKey = jest.fn();

jest.mock('../../../Encryptor', () => ({
  DERIVATION_OPTIONS_MINIMUM_OWASP2023: { algorithm: 'PBKDF2' },
  Encryptor: jest.fn().mockImplementation(() => ({
    importKey: mockImportKey,
    encryptWithKey: mockEncryptWithKey,
    decryptWithKey: mockDecryptWithKey,
    generateSalt: mockGenerateSalt,
    keyFromPassword: mockKeyFromPassword,
    exportKey: mockExportKey,
  })),
}));

describe('createPendingOperationEncryptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the Encryptor key helpers', () => {
    const encryptor = createPendingOperationEncryptor();

    expect(encryptor.importKey).toBe(mockImportKey);
    expect(encryptor.encryptWithKey).toBe(mockEncryptWithKey);
    expect(encryptor.decryptWithKey).toBe(mockDecryptWithKey);
  });
});

describe('createPendingOperationKeyGetter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateSalt
      .mockReturnValueOnce('salt-a')
      .mockReturnValueOnce('salt-b');
    mockKeyFromPassword.mockResolvedValue({ key: 'material' });
    mockExportKey.mockResolvedValue('serialized-key');
  });

  it('generates and caches a serialized pending-operation key', async () => {
    const getKey = createPendingOperationKeyGetter();

    const first = await getKey();
    const second = await getKey();

    expect(first).toBe('serialized-key');
    expect(second).toBe('serialized-key');
    expect(mockGenerateSalt).toHaveBeenCalledTimes(2);
    expect(mockKeyFromPassword).toHaveBeenCalledWith('salt-a', 'salt-b', true);
    expect(mockExportKey).toHaveBeenCalledTimes(1);
  });
});
