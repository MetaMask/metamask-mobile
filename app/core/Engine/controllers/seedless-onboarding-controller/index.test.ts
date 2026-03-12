import { seedlessOnboardingControllerInit } from '.';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerMessenger,
  SeedlessOnboardingControllerState,
} from '@metamask/seedless-onboarding-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/seedless-onboarding-controller', () => {
  const actualSeedlessOnboardingController = jest.requireActual(
    '@metamask/seedless-onboarding-controller',
  );
  return {
    controllerName: actualSeedlessOnboardingController.controllerName,
    getDefaultSeedlessOnboardingControllerState:
      actualSeedlessOnboardingController.getDefaultSeedlessOnboardingControllerState,
    SeedlessOnboardingController: jest.fn(),
    Web3AuthNetwork: actualSeedlessOnboardingController.Web3AuthNetwork,
  };
});

// Mock web3AuthNetwork constant - default to a valid value
const mockWeb3AuthNetwork = { value: 'sapphire_devnet' };
jest.mock('../../../OAuthService/OAuthLoginHandlers/constants', () => ({
  get web3AuthNetwork() {
    return mockWeb3AuthNetwork.value;
  },
}));

// Mock AuthTokenHandler - define mock functions inside the factory to avoid hoisting issues
jest.mock('../../../OAuthService/AuthTokenHandler', () => {
  const mockRefreshJWTTokenFn = jest.fn();
  const mockRenewRefreshTokenFn = jest.fn();
  const mockRevokeRefreshTokenFn = jest.fn();

  return {
    __esModule: true,
    default: {
      refreshJWTToken: mockRefreshJWTTokenFn,
      renewRefreshToken: mockRenewRefreshTokenFn,
      revokeRefreshToken: mockRevokeRefreshTokenFn,
    },
    // Export mock functions so tests can access them
    __mockRefreshJWTToken: mockRefreshJWTTokenFn,
    __mockRenewRefreshToken: mockRenewRefreshTokenFn,
    __mockRevokeRefreshToken: mockRevokeRefreshTokenFn,
  };
});

// Access AuthTokenHandler mock functions
const getAuthTokenHandlerMocks = () => {
  const mocks = jest.requireMock('../../../OAuthService/AuthTokenHandler') as {
    __mockRefreshJWTToken: jest.Mock;
    __mockRenewRefreshToken: jest.Mock;
    __mockRevokeRefreshToken: jest.Mock;
  };
  return {
    mockRefreshJWTToken: mocks.__mockRefreshJWTToken,
    mockRenewRefreshToken: mocks.__mockRenewRefreshToken,
    mockRevokeRefreshToken: mocks.__mockRevokeRefreshToken,
  };
};

// Mock Encryptor
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

// Access mock functions from the mocked module
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

const mockEncryptResult = {
  cipher: 'encrypted-cipher-data',
  iv: 'mock-iv',
  salt: 'mock-salt',
  lib: 'mock-lib',
  keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
};

describe('seedless onboarding controller init', () => {
  const seedlessOnboardingControllerClassMock = jest.mocked(
    SeedlessOnboardingController,
  );
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<SeedlessOnboardingControllerMessenger>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset web3AuthNetwork to valid value before each test
    mockWeb3AuthNetwork.value = 'sapphire_devnet';

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
      exportedKeyString: 'mock-key-string',
      salt: 'mock-salt',
    });

    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(
      seedlessOnboardingControllerInit(initRequestMock).controller,
    ).toBeInstanceOf(SeedlessOnboardingController);
  });

  it('controller state should be default state when no initial state is passed in', () => {
    const defaultSeedlessOnboardingControllerState = jest
      .requireActual('@metamask/seedless-onboarding-controller')
      .getDefaultSeedlessOnboardingControllerState();

    seedlessOnboardingControllerInit(initRequestMock);

    const seedlessOnboardingControllerState =
      seedlessOnboardingControllerClassMock.mock.calls[0][0].state;

    expect(seedlessOnboardingControllerState).toEqual(
      defaultSeedlessOnboardingControllerState,
    );
  });

  it('controller state should be initial state when initial state is passed in', () => {
    const initialSeedlessOnboardingControllerState: Partial<SeedlessOnboardingControllerState> =
      {
        vault: undefined,
        nodeAuthTokens: undefined,
      };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      SeedlessOnboardingController: initialSeedlessOnboardingControllerState,
    };

    seedlessOnboardingControllerInit(initRequestMock);

    const seedlessOnboardingControllerState =
      seedlessOnboardingControllerClassMock.mock.calls[0][0].state;

    expect(seedlessOnboardingControllerState).toStrictEqual(
      initialSeedlessOnboardingControllerState,
    );
  });

  describe('encryptorAdapter', () => {
    it('encryptWithKey maps cipher to data field', async () => {
      const { mockEncryptWithKey } = getEncryptorMocks();
      seedlessOnboardingControllerInit(initRequestMock);

      const encryptorAdapter =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const mockKey = {
        key: 'test-key',
        lib: 'test-lib',
        exportable: true,
        keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
      };
      const testData = { test: 'data' };

      const result = await encryptorAdapter.encryptWithKey(mockKey, testData);

      expect(mockEncryptWithKey).toHaveBeenCalledWith(mockKey, testData);
      expect(result).toHaveProperty('data', mockEncryptResult.cipher);
      expect(result).toHaveProperty('iv', mockEncryptResult.iv);
      expect(result).toHaveProperty('salt', mockEncryptResult.salt);
    });

    it('decryptWithKey maps data to cipher field', async () => {
      const { mockDecryptWithKey } = getEncryptorMocks();
      seedlessOnboardingControllerInit(initRequestMock);

      const encryptorAdapter =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

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

      const decrypted = await encryptorAdapter.decryptWithKey(
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
      seedlessOnboardingControllerInit(initRequestMock);

      const encryptorAdapter =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const mockKey = { key: 'test-key', lib: 'test-lib', exportable: true };
      // Legacy vault format: uses 'cipher' instead of 'data'
      const legacyEncryptedObject = {
        cipher: 'legacy-cipher-data',
        iv: 'test-iv',
        salt: 'test-salt',
      };

      // Cast as never: the package type expects `data` (DefaultEncryptionResult), but we
      // intentionally pass a legacy vault with `cipher` only to test the fallback path.
      await encryptorAdapter.decryptWithKey(
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
      seedlessOnboardingControllerInit(initRequestMock);

      const encryptorAdapter =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const mockKey = { key: 'test-key', lib: 'test-lib', exportable: true };
      const malformedObject = { iv: 'test-iv', salt: 'test-salt' };

      // Cast as never: the package type expects `data` (DefaultEncryptionResult), but we
      // intentionally pass a malformed vault (missing both fields) to test the error path.
      await expect(
        encryptorAdapter.decryptWithKey(mockKey, malformedObject as never),
      ).rejects.toThrow(
        'SeedlessOnboardingController encryptorAdapter: vault is missing both "data" and "cipher" fields',
      );
    });

    it('decrypt normalizes data-format vault before decryption', async () => {
      const { mockDecrypt } = getEncryptorMocks();
      seedlessOnboardingControllerInit(initRequestMock);

      const encryptorAdapter =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const dataFormatVault = JSON.stringify({
        data: 'encrypted-data',
        iv: 'test-iv',
        salt: 'test-salt',
      });

      await encryptorAdapter.decrypt('password', dataFormatVault);

      // Should normalize 'data' → 'cipher' before passing to underlying encryptor
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
      seedlessOnboardingControllerInit(initRequestMock);

      const encryptorAdapter =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const cipherFormatVault = JSON.stringify({
        cipher: 'encrypted-cipher',
        iv: 'test-iv',
        salt: 'test-salt',
      });

      await encryptorAdapter.decrypt('password', cipherFormatVault);

      expect(mockDecrypt).toHaveBeenCalledWith('password', cipherFormatVault);
    });

    it('decryptWithDetail normalizes data-format vault before decryption', async () => {
      const { mockDecryptWithDetail } = getEncryptorMocks();
      seedlessOnboardingControllerInit(initRequestMock);

      const encryptorAdapter =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const dataFormatVault = JSON.stringify({
        data: 'encrypted-data',
        iv: 'test-iv',
        salt: 'test-salt',
      });

      await encryptorAdapter.decryptWithDetail('password', dataFormatVault);

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
      seedlessOnboardingControllerInit(initRequestMock);

      const encryptorAdapter =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const cipherFormatVault = JSON.stringify({
        cipher: 'encrypted-cipher',
        iv: 'test-iv',
        salt: 'test-salt',
      });

      await encryptorAdapter.decryptWithDetail('password', cipherFormatVault);

      expect(mockDecryptWithDetail).toHaveBeenCalledWith(
        'password',
        cipherFormatVault,
      );
    });

    /**
     * End-to-end bug reproduction scenario:
     *
     * Bug (pre-fix): While the wallet is unlocked, a background JWT token
     * refresh triggers SeedlessOnboardingController#updateVault, which calls
     * encryptWithKey via the adapter. The adapter returns { data, iv, salt }
     * (browser-passworder format). This vault string (with `data`, no `cipher`)
     * is persisted to state.
     *
     * On next unlock, the controller reads the persisted vault and calls
     * decrypt / decryptWithDetail. The underlying mobile Encryptor reads
     * `cipher` from the parsed vault — finds undefined — and crashes with
     * "TypeError: The first argument must be one of type string, Buffer..."
     *
     * Fix: normalizeVaultFormat detects a vault that has `data` but no
     * `cipher` and injects cipher = data before handing it to the Encryptor.
     */
    describe('end-to-end: background token refresh followed by unlock', () => {
      it('decrypt can read a vault written by encryptWithKey (data-format vault)', async () => {
        const { mockDecrypt } = getEncryptorMocks();
        seedlessOnboardingControllerInit(initRequestMock);

        const encryptorAdapter =
          seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

        const mockKey = {
          key: 'test-key',
          lib: 'test-lib',
          exportable: true,
          keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
        };

        // Step 1: background token refresh writes vault via encryptWithKey
        // → adapter converts cipher → data, returning browser-passworder format
        const encryptedVault = await encryptorAdapter.encryptWithKey(mockKey, {
          secret: 'seed-phrase',
        });
        expect(encryptedVault).toHaveProperty('data'); // data, not cipher
        expect(encryptedVault).not.toHaveProperty('cipher');

        // Step 2: controller serializes and persists the vault
        const persistedVaultString = JSON.stringify(encryptedVault);

        // Step 3: wallet locks, vaultEncryptionKey is cleared (persist: false).
        // On next unlock the controller calls decrypt with the persisted string.
        // Without the fix this would crash because the Encryptor reads `cipher`
        // (undefined here) and passes it to QuickCryptoLib.decrypt.
        await encryptorAdapter.decrypt('user-password', persistedVaultString);

        // The underlying Encryptor must receive the vault with `cipher` injected
        const expectedNormalized = JSON.stringify({
          ...encryptedVault,
          cipher: encryptedVault.data,
        });
        expect(mockDecrypt).toHaveBeenCalledWith(
          'user-password',
          expectedNormalized,
        );
      });

      it('decryptWithDetail can read a vault written by encryptWithKey (data-format vault)', async () => {
        const { mockDecryptWithDetail } = getEncryptorMocks();
        seedlessOnboardingControllerInit(initRequestMock);

        const encryptorAdapter =
          seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

        const mockKey = {
          key: 'test-key',
          lib: 'test-lib',
          exportable: true,
          keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
        };

        // Step 1: background token refresh writes vault via encryptWithKey
        const encryptedVault = await encryptorAdapter.encryptWithKey(mockKey, {
          secret: 'seed-phrase',
        });

        // Step 2: persist
        const persistedVaultString = JSON.stringify(encryptedVault);

        // Step 3: unlock via decryptWithDetail (used when vaultEncryptionKey is absent)
        await encryptorAdapter.decryptWithDetail(
          'user-password',
          persistedVaultString,
        );

        const expectedNormalized = JSON.stringify({
          ...encryptedVault,
          cipher: encryptedVault.data,
        });
        expect(mockDecryptWithDetail).toHaveBeenCalledWith(
          'user-password',
          expectedNormalized,
        );
      });
    });
  });

  describe('controller initialization parameters', () => {
    it('passes correct configuration to SeedlessOnboardingController', () => {
      const {
        mockRefreshJWTToken,
        mockRenewRefreshToken,
        mockRevokeRefreshToken,
      } = getAuthTokenHandlerMocks();

      seedlessOnboardingControllerInit(initRequestMock);

      const constructorArgs =
        seedlessOnboardingControllerClassMock.mock.calls[0][0];

      expect(constructorArgs).toHaveProperty('messenger');
      expect(constructorArgs).toHaveProperty('state');
      expect(constructorArgs).toHaveProperty('encryptor');
      expect(constructorArgs).toHaveProperty('network', 'sapphire_devnet');
      expect(constructorArgs).toHaveProperty(
        'passwordOutdatedCacheTTL',
        15_000,
      );
      expect(constructorArgs).toHaveProperty(
        'refreshJWTToken',
        mockRefreshJWTToken,
      );
      expect(constructorArgs).toHaveProperty(
        'renewRefreshToken',
        mockRenewRefreshToken,
      );
      expect(constructorArgs).toHaveProperty(
        'revokeRefreshToken',
        mockRevokeRefreshToken,
      );
    });
  });

  describe('environment validation', () => {
    it('throws error when web3AuthNetwork is not defined', () => {
      mockWeb3AuthNetwork.value = '';

      expect(() => seedlessOnboardingControllerInit(initRequestMock)).toThrow(
        'Missing environment variables for SeedlessOnboardingController',
      );
    });
  });
});
