import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

import AuthTokenHandler from '../../../OAuthService/AuthTokenHandler';
import { web3AuthNetwork } from '../../../OAuthService/OAuthLoginHandlers/constants';
import {
  getSeedlessOnboardingControllerInstanceOptions,
  seedlessOnboardingEncryptorAdapter,
} from './seedless-onboarding-controller';

const mockEncryptResult = {
  cipher: 'encrypted-cipher-data',
  iv: 'mock-iv',
  salt: 'mock-salt',
  lib: 'mock-lib',
  keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
};

jest.mock('../../../Encryptor', () => {
  const mockEncryptWithKeyFn = jest.fn();
  const mockDecryptWithKeyFn = jest.fn();
  const mockDecryptFn = jest.fn();
  const mockDecryptWithDetailFn = jest.fn();

  return {
    Encryptor: jest.fn().mockImplementation(() => ({
      encryptWithKey: mockEncryptWithKeyFn,
      decryptWithKey: mockDecryptWithKeyFn,
      decrypt: mockDecryptFn,
      decryptWithDetail: mockDecryptWithDetailFn,
    })),
    LEGACY_DERIVATION_OPTIONS: {
      algorithm: 'PBKDF2',
      params: { iterations: 600000 },
    },
    __mockEncryptWithKey: mockEncryptWithKeyFn,
    __mockDecryptWithKey: mockDecryptWithKeyFn,
    __mockDecrypt: mockDecryptFn,
    __mockDecryptWithDetail: mockDecryptWithDetailFn,
  };
});

jest.mock('../../../OAuthService/AuthTokenHandler', () => ({
  __esModule: true,
  default: {
    refreshJWTToken: jest.fn(),
    renewRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  },
}));

jest.mock('../../../OAuthService/OAuthLoginHandlers/constants', () => ({
  web3AuthNetwork: 'sapphire_mainnet',
}));

const getEncryptorMocks = () => {
  const mocks = jest.requireMock('../../../Encryptor') as {
    __mockEncryptWithKey: jest.Mock;
    __mockDecryptWithKey: jest.Mock;
    __mockDecrypt: jest.Mock;
    __mockDecryptWithDetail: jest.Mock;
  };
  return {
    mockEncryptWithKey: mocks.__mockEncryptWithKey,
    mockDecryptWithKey: mocks.__mockDecryptWithKey,
    mockDecrypt: mocks.__mockDecrypt,
    mockDecryptWithDetail: mocks.__mockDecryptWithDetail,
  };
};

describe('getSeedlessOnboardingControllerInstanceOptions', () => {
  beforeEach(() => {
    const {
      mockEncryptWithKey,
      mockDecryptWithKey,
      mockDecrypt,
      mockDecryptWithDetail,
    } = getEncryptorMocks();
    mockEncryptWithKey.mockResolvedValue(mockEncryptResult);
    mockDecryptWithKey.mockResolvedValue({ test: 'decrypted-data' });
    mockDecrypt.mockResolvedValue({ test: 'decrypted-data' });
    mockDecryptWithDetail.mockResolvedValue({
      vault: { test: 'decrypted-data' },
      exportedKeyString: 'key',
    });
  });

  it('returns mobile seedless options with JWT handlers and encryptor adapter', () => {
    const options = getSeedlessOnboardingControllerInstanceOptions();

    expect(options).toEqual({
      encryptor: seedlessOnboardingEncryptorAdapter,
      network: 'sapphire_mainnet' as Web3AuthNetwork,
      passwordOutdatedCacheTTL: 15_000,
      refreshJWTToken: AuthTokenHandler.refreshJWTToken,
      renewRefreshToken: AuthTokenHandler.renewRefreshToken,
      revokeRefreshToken: AuthTokenHandler.revokeRefreshToken,
    });
  });

  it('throws when WEB3AUTH_NETWORK is missing', () => {
    const constants = jest.requireMock(
      '../../../OAuthService/OAuthLoginHandlers/constants',
    ) as { web3AuthNetwork: string };
    const originalNetwork = constants.web3AuthNetwork;
    constants.web3AuthNetwork = '';

    try {
      expect(() => getSeedlessOnboardingControllerInstanceOptions()).toThrow(
        /Missing environment variables for SeedlessOnboardingController/,
      );
    } finally {
      constants.web3AuthNetwork = originalNetwork;
    }
  });
});

describe('seedlessOnboardingEncryptorAdapter', () => {
  beforeEach(() => {
    const {
      mockEncryptWithKey,
      mockDecryptWithKey,
      mockDecrypt,
      mockDecryptWithDetail,
    } = getEncryptorMocks();
    mockEncryptWithKey.mockResolvedValue(mockEncryptResult);
    mockDecryptWithKey.mockResolvedValue({ test: 'decrypted-data' });
    mockDecrypt.mockResolvedValue({ test: 'decrypted-data' });
    mockDecryptWithDetail.mockResolvedValue({
      vault: { test: 'decrypted-data' },
      exportedKeyString: 'key',
    });
  });

  it('encryptWithKey maps cipher to data field', async () => {
    const { mockEncryptWithKey } = getEncryptorMocks();
    const mockKey = {
      key: 'test-key',
      lib: 'test-lib',
      exportable: true,
      keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
    };
    const testData = { test: 'data' };

    const result = await seedlessOnboardingEncryptorAdapter.encryptWithKey(
      mockKey,
      testData,
    );

    expect(mockEncryptWithKey).toHaveBeenCalledWith(mockKey, testData);
    expect(result).toHaveProperty('data', mockEncryptResult.cipher);
    expect(result).toHaveProperty('iv', mockEncryptResult.iv);
    expect(result).toHaveProperty('salt', mockEncryptResult.salt);
  });

  it('decryptWithKey maps data to cipher field', async () => {
    const { mockDecryptWithKey } = getEncryptorMocks();
    const mockKey = {
      key: 'test-key',
      lib: 'test-lib',
      exportable: true,
      keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
    };
    const encryptedObject = {
      data: 'encrypted-data',
      iv: 'test-iv',
      salt: 'test-salt',
      lib: 'test-lib',
      keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
    };

    const decrypted = await seedlessOnboardingEncryptorAdapter.decryptWithKey(
      mockKey,
      encryptedObject,
    );

    expect(mockDecryptWithKey).toHaveBeenCalledWith(mockKey, {
      cipher: encryptedObject.data,
      iv: encryptedObject.iv,
      salt: encryptedObject.salt,
      lib: encryptedObject.lib,
      keyMetadata: encryptedObject.keyMetadata,
    });
    expect(decrypted).toEqual({ test: 'decrypted-data' });
  });

  it('decryptWithKey falls back to cipher field for pre-adapter vaults', async () => {
    const { mockDecryptWithKey } = getEncryptorMocks();
    const mockKey = { key: 'test-key', lib: 'test-lib', exportable: true };
    const legacyEncryptedObject = {
      cipher: 'legacy-cipher-data',
      iv: 'test-iv',
      salt: 'test-salt',
    };

    await seedlessOnboardingEncryptorAdapter.decryptWithKey(
      mockKey,
      legacyEncryptedObject as never,
    );

    expect(mockDecryptWithKey).toHaveBeenCalledWith(mockKey, {
      cipher: 'legacy-cipher-data',
      iv: 'test-iv',
      salt: 'test-salt',
      lib: undefined,
      keyMetadata: undefined,
    });
  });

  it('decryptWithKey throws when both data and cipher are absent', async () => {
    const mockKey = { key: 'test-key', lib: 'test-lib', exportable: true };
    const malformedObject = { iv: 'test-iv', salt: 'test-salt' };

    await expect(
      seedlessOnboardingEncryptorAdapter.decryptWithKey(
        mockKey,
        malformedObject as never,
      ),
    ).rejects.toThrow(
      'SeedlessOnboardingController encryptorAdapter: vault is missing both "data" and "cipher" fields',
    );
  });

  it('decrypt normalizes data-format vault before decryption', async () => {
    const { mockDecrypt } = getEncryptorMocks();
    const dataFormatVault = JSON.stringify({
      data: 'encrypted-data',
      iv: 'test-iv',
      salt: 'test-salt',
    });

    await seedlessOnboardingEncryptorAdapter.decrypt(
      'password',
      dataFormatVault,
    );

    const expectedNormalized = JSON.stringify({
      data: 'encrypted-data',
      iv: 'test-iv',
      salt: 'test-salt',
      cipher: 'encrypted-data',
    });
    expect(mockDecrypt).toHaveBeenCalledWith('password', expectedNormalized);
  });

  it('decrypt passes cipher-format vault through unchanged', async () => {
    const { mockDecrypt } = getEncryptorMocks();
    const cipherFormatVault = JSON.stringify({
      cipher: 'encrypted-cipher',
      iv: 'test-iv',
      salt: 'test-salt',
    });

    await seedlessOnboardingEncryptorAdapter.decrypt(
      'password',
      cipherFormatVault,
    );

    expect(mockDecrypt).toHaveBeenCalledWith('password', cipherFormatVault);
  });

  it('decryptWithDetail normalizes data-format vault before decryption', async () => {
    const { mockDecryptWithDetail } = getEncryptorMocks();
    const dataFormatVault = JSON.stringify({
      data: 'encrypted-data',
      iv: 'test-iv',
      salt: 'test-salt',
    });

    await seedlessOnboardingEncryptorAdapter.decryptWithDetail(
      'password',
      dataFormatVault,
    );

    const expectedNormalized = JSON.stringify({
      data: 'encrypted-data',
      iv: 'test-iv',
      salt: 'test-salt',
      cipher: 'encrypted-data',
    });
    expect(mockDecryptWithDetail).toHaveBeenCalledWith(
      'password',
      expectedNormalized,
    );
  });

  it('decryptWithDetail passes cipher-format vault through unchanged', async () => {
    const { mockDecryptWithDetail } = getEncryptorMocks();
    const cipherFormatVault = JSON.stringify({
      cipher: 'encrypted-cipher',
      iv: 'test-iv',
      salt: 'test-salt',
    });

    await seedlessOnboardingEncryptorAdapter.decryptWithDetail(
      'password',
      cipherFormatVault,
    );

    expect(mockDecryptWithDetail).toHaveBeenCalledWith(
      'password',
      cipherFormatVault,
    );
  });

  it('decrypt can read a vault written by encryptWithKey (data-format vault)', async () => {
    const { mockDecrypt } = getEncryptorMocks();
    const mockKey = {
      key: 'test-key',
      lib: 'test-lib',
      exportable: true,
      keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
    };

    const encryptedVault =
      await seedlessOnboardingEncryptorAdapter.encryptWithKey(mockKey, {
        secret: 'seed-phrase',
      });
    expect(encryptedVault).toHaveProperty('data');
    expect(encryptedVault).not.toHaveProperty('cipher');

    const persistedVaultString = JSON.stringify(encryptedVault);
    await seedlessOnboardingEncryptorAdapter.decrypt(
      'user-password',
      persistedVaultString,
    );

    const expectedNormalized = JSON.stringify({
      ...encryptedVault,
      cipher: mockEncryptResult.cipher,
    });
    expect(mockDecrypt).toHaveBeenCalledWith(
      'user-password',
      expectedNormalized,
    );
  });

  it('decryptWithDetail can read a vault written by encryptWithKey (data-format vault)', async () => {
    const { mockDecryptWithDetail } = getEncryptorMocks();
    const mockKey = {
      key: 'test-key',
      lib: 'test-lib',
      exportable: true,
      keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
    };

    const encryptedVault =
      await seedlessOnboardingEncryptorAdapter.encryptWithKey(mockKey, {
        secret: 'seed-phrase',
      });
    const persistedVaultString = JSON.stringify(encryptedVault);

    await seedlessOnboardingEncryptorAdapter.decryptWithDetail(
      'user-password',
      persistedVaultString,
    );

    const expectedNormalized = JSON.stringify({
      ...encryptedVault,
      cipher: mockEncryptResult.cipher,
    });
    expect(mockDecryptWithDetail).toHaveBeenCalledWith(
      'user-password',
      expectedNormalized,
    );
  });
});
