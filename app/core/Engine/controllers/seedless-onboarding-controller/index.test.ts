import { seedlessOnboardingControllerInit } from '.';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import type { MessengerClientInitRequest } from '../../types';
import { getSeedlessOnboardingControllerMessenger } from '../../messengers/seedless-onboarding-controller-messenger';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerMessenger,
  SeedlessOnboardingControllerState,
} from '@metamask/seedless-onboarding-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import type { EncryptionResult } from '../../../Encryptor/types';

jest.mock('./trackSeedlessLegacyDataVaultDecrypt', () => ({
  trackSeedlessLegacyDataVaultDecrypt: jest.fn(),
}));

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

const getSeedlessLegacyDataVaultTrackingMocks = () => {
  const mocks = jest.requireMock('./trackSeedlessLegacyDataVaultDecrypt') as {
    trackSeedlessLegacyDataVaultDecrypt: jest.Mock;
  };
  return {
    mockTrackSeedlessLegacyDataVaultDecrypt:
      mocks.trackSeedlessLegacyDataVaultDecrypt,
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

function getInitRequestMock(
  overrides?: Partial<
    MessengerClientInitRequest<SeedlessOnboardingControllerMessenger>
  >,
): jest.Mocked<
  MessengerClientInitRequest<SeedlessOnboardingControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger:
      getSeedlessOnboardingControllerMessenger(baseMessenger),
    initMessenger: undefined,
    ...overrides,
  } as jest.Mocked<
    MessengerClientInitRequest<SeedlessOnboardingControllerMessenger>
  >;
}

describe('seedless onboarding controller init', () => {
  const seedlessOnboardingControllerClassMock = jest.mocked(
    SeedlessOnboardingController,
  );
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<SeedlessOnboardingControllerMessenger>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset web3AuthNetwork to valid value before each test
    mockWeb3AuthNetwork.value = 'sapphire_devnet';

    const { mockTrackSeedlessLegacyDataVaultDecrypt } =
      getSeedlessLegacyDataVaultTrackingMocks();
    mockTrackSeedlessLegacyDataVaultDecrypt.mockClear();

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

    initRequestMock = getInitRequestMock();
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

  describe('encryptor', () => {
    it('passes SeedlessEncryptor instance with overridden decryptWithKey', () => {
      const { mockEncryptWithKey, mockDecryptWithKey } = getEncryptorMocks();

      seedlessOnboardingControllerInit(initRequestMock);

      const passedEncryptor =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      expect(passedEncryptor.encryptWithKey).toBe(mockEncryptWithKey);
      expect(passedEncryptor.decryptWithKey).not.toBe(mockDecryptWithKey);
    });

    it('encryptWithKey returns cipher field from Encryptor', async () => {
      const { mockEncryptWithKey } = getEncryptorMocks();
      seedlessOnboardingControllerInit(initRequestMock);

      const passedEncryptor =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const mockKey = {
        key: 'test-key',
        lib: 'test-lib',
        exportable: true,
        keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
      };
      const testData = { test: 'data' };

      const result = await passedEncryptor.encryptWithKey(mockKey, testData);

      expect(mockEncryptWithKey).toHaveBeenCalledWith(mockKey, testData);
      expect(result).toEqual(mockEncryptResult);
      expect(result).toHaveProperty('cipher', mockEncryptResult.cipher);
      expect(result).not.toHaveProperty('data');
    });

    it('decryptWithKey delegates data-only payload to base encryptor with cipher', async () => {
      const { mockDecryptWithKey } = getEncryptorMocks();
      const { mockTrackSeedlessLegacyDataVaultDecrypt } =
        getSeedlessLegacyDataVaultTrackingMocks();

      seedlessOnboardingControllerInit(initRequestMock);

      const passedEncryptor =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const mockKey = {
        key: 'test-key',
        lib: 'test-lib',
        exportable: true,
        keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
      };
      const payload = {
        data: 'encrypted-data',
        iv: 'test-iv',
        salt: 'test-salt',
        lib: 'original',
      };

      await passedEncryptor.decryptWithKey(mockKey, payload);

      expect(mockDecryptWithKey).toHaveBeenCalledWith(mockKey, {
        ...payload,
        cipher: 'encrypted-data',
      });
      expect(mockTrackSeedlessLegacyDataVaultDecrypt).toHaveBeenCalledWith({
        lib: 'original',
        source: 'seedlessEncryptor',
      });
    });

    it('decryptWithKey passes cipher-only payload through to base encryptor', async () => {
      const { mockDecryptWithKey } = getEncryptorMocks();
      const { mockTrackSeedlessLegacyDataVaultDecrypt } =
        getSeedlessLegacyDataVaultTrackingMocks();

      seedlessOnboardingControllerInit(initRequestMock);

      const passedEncryptor =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const mockKey = {
        key: 'test-key',
        lib: 'test-lib',
        exportable: true,
        keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
      };
      const payload: EncryptionResult = {
        cipher: 'encrypted-cipher',
        iv: 'test-iv',
      };

      await passedEncryptor.decryptWithKey(mockKey, payload);

      expect(mockDecryptWithKey).toHaveBeenCalledWith(mockKey, {
        ...payload,
        cipher: 'encrypted-cipher',
      });
      expect(mockTrackSeedlessLegacyDataVaultDecrypt).not.toHaveBeenCalled();
    });

    it('decryptWithKey throws when cipher and data are both missing', async () => {
      seedlessOnboardingControllerInit(initRequestMock);

      const passedEncryptor =
        seedlessOnboardingControllerClassMock.mock.calls[0][0].encryptor;

      const mockKey = {
        key: 'test-key',
        lib: 'test-lib',
        exportable: true,
        keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 600000 } },
      };

      await expect(
        passedEncryptor.decryptWithKey(mockKey, {
          iv: 'test-iv',
        } as EncryptionResult & { data?: string }),
      ).rejects.toThrow(
        'Encrypted payload is missing both "cipher" and "data" fields',
      );
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
