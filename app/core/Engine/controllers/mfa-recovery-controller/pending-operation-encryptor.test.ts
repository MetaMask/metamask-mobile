import { Encryptor } from '../../../Encryptor';
import { createPendingOperationEncryptor } from './pending-operation-encryptor';

const mockEncryptor = {
  importKey: jest.fn(),
  exportKey: jest.fn(),
  generateSalt: jest.fn(),
  encryptWithKey: jest.fn(),
  decryptWithKey: jest.fn(),
  keyFromPassword: jest.fn().mockResolvedValue('derived-key'),
};

jest.mock('../../../Encryptor', () => ({
  Encryptor: jest.fn(() => mockEncryptor),
  DERIVATION_OPTIONS_MINIMUM_OWASP2023: {
    algorithm: 'PBKDF2',
    params: { iterations: 600000 },
  },
}));

describe('createPendingOperationEncryptor', () => {
  it('creates an encryptor configured like KeyringController', () => {
    createPendingOperationEncryptor();

    expect(Encryptor).toHaveBeenCalledWith({
      keyDerivationOptions: {
        algorithm: 'PBKDF2',
        params: { iterations: 600000 },
      },
    });
  });

  it('passes the key and encryption methods through', () => {
    const encryptor = createPendingOperationEncryptor();

    expect(encryptor).toMatchObject({
      importKey: mockEncryptor.importKey,
      exportKey: mockEncryptor.exportKey,
      generateSalt: mockEncryptor.generateSalt,
      encryptWithKey: mockEncryptor.encryptWithKey,
      decryptWithKey: mockEncryptor.decryptWithKey,
    });
  });

  it('derives keys with the configured derivation options', async () => {
    const encryptor = createPendingOperationEncryptor();

    await expect(
      encryptor.keyFromPassword('password', 'salt', true, { ignored: true }),
    ).resolves.toBe('derived-key');
    expect(mockEncryptor.keyFromPassword).toHaveBeenCalledWith(
      'password',
      'salt',
      true,
    );
  });
});
