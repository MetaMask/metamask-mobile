import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../util/device';
import persistConfig from './persistConfig';
import { version } from './migrations';
import Engine from '../core/Engine';
import { Transform } from 'redux-persist';
import { EngineContext } from '../core/Engine/types';

interface FieldMetadata {
  persist: boolean;
  anonymous: boolean;
}

interface ControllerMetadata {
  [key: string]: FieldMetadata;
}

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('redux-persist-filesystem-storage');
jest.mock('../util/device');
jest.mock('../util/Logger');
jest.mock('@metamask/base-controller', () => ({
  getPersistentState: (
    state: Record<string, unknown>,
    metadata: ControllerMetadata | undefined,
  ) => {
    if (!metadata) return {};
    return Object.entries(state).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        const fieldMetadata = metadata[key];
        if (fieldMetadata?.persist) {
          acc[key] = value;
        }
        return acc;
      },
      {},
    );
  },
}));

// Mock redux-persist
jest.mock('redux-persist', () => ({
  createMigrate: () => () => Promise.resolve({}),
  createTransform: (
    inbound: unknown,
    outbound: unknown,
    config: { whitelist?: string[] },
  ) => ({
    in: inbound,
    out: outbound,
    whitelist: config.whitelist,
  }),
}));

// Create mock Engine interface
interface MockEngine {
  context: EngineContext;
  setMockContext: (context: EngineContext) => void;
  clearMockContext: () => void;
}

// Mock Engine module
jest.mock('../core/Engine', () => {
  let mockContext: EngineContext | undefined;
  return {
    __esModule: true,
    default: {
      get context() {
        if (!mockContext) {
          throw new Error('Engine does not exist');
        }
        return mockContext;
      },
      setMockContext(context: EngineContext) {
        mockContext = context;
      },
      clearMockContext() {
        mockContext = undefined;
      },
    } as MockEngine,
  };
});

// Mock migrations
const mockMigrations = {
  1: (state: unknown) => state,
};

jest.mock('./migrations', () => ({
  version: 1,
  migrations: mockMigrations,
}));

// Mock debounce
jest.mock('lodash', () => ({
  debounce: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

describe('persistConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Device.isIos
    (Device.isIos as jest.Mock).mockReturnValue(true);
    // Clear Engine mock context
    (Engine as unknown as MockEngine).clearMockContext();
  });

  describe('configuration', () => {
    it('have correct basic configuration', () => {
      expect(persistConfig.key).toBe('root');
      expect(persistConfig.version).toBe(version);
      expect(persistConfig.timeout).toBe(40000);
      expect(persistConfig.blacklist).toEqual([
        'rpcEvents',
        'accounts',
        'confirmationMetrics',
        'alert',
      ]);
    });

    it('have correct storage configuration', () => {
      expect(persistConfig.storage).toBeDefined();
      expect(persistConfig.stateReconciler).toBeDefined();
      expect(persistConfig.migrate).toBeDefined();
    });
  });

  describe('storage operations', () => {
    const mockKey = 'test-key';
    const mockValue = 'test-value';

    beforeEach(() => {
      // Mock FilesystemStorage methods
      (FilesystemStorage.getItem as jest.Mock).mockResolvedValue(null);
      (FilesystemStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (FilesystemStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('get item from FilesystemStorage first', async () => {
      const mockStorageValue = 'filesystem-value';
      (FilesystemStorage.getItem as jest.Mock).mockResolvedValue(
        mockStorageValue,
      );

      const result = await persistConfig.storage.getItem(mockKey);
      expect(result).toBe(mockStorageValue);
      expect(FilesystemStorage.getItem).toHaveBeenCalledWith(mockKey);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('fallback to AsyncStorage if FilesystemStorage fails', async () => {
      const mockStorageValue = 'async-storage-value';
      (FilesystemStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockStorageValue);

      const result = await persistConfig.storage.getItem(mockKey);
      expect(result).toBe(mockStorageValue);
      expect(FilesystemStorage.getItem).toHaveBeenCalledWith(mockKey);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(mockKey);
    });

    it('set item using FilesystemStorage', async () => {
      // Mock Engine context with minimal required properties
      const mockContext = {
        // Required controllers
        KeyringController: { metadata: { vault: 'test-vault' } },
        AccountTrackerController: {},
        AddressBookController: {},
        AppMetadataController: {},
        NftController: {},
        TokenListController: {},
        CurrencyRateController: {},
        NetworkController: {},
        PreferencesController: {},
        RemoteFeatureFlagController: {},
        PhishingController: {},
        TokenBalancesController: {},
        TokenRatesController: {},
        TokenSearchDiscoveryController: {},
        TransactionController: {},
        SmartTransactionsController: {},
        SwapsController: {},
        GasFeeController: {},
        TokensController: {},
        PermissionController: {},
        SnapController: {},
        SnapsRegistry: {},
        SubjectMetadataController: {},
        AuthenticationController: {},
        UserStorageController: {},
        NotificationServicesController: {},
        NotificationServicesPushController: {},
        SnapInterfaceController: {},
        CronjobController: {},
        // Optional controllers
        AssetsContractController: {},
        ExecutionService: {},
        NftDetectionController: {},
        TokenDetectionController: {},
        RatesController: {},
        MultichainAssetsController: {},
        MultichainAssetsRatesController: {},
        MultichainBalancesController: {},
        MultichainTransactionsController: {},
        TokenSearchDiscoveryDataController: {},
        MultichainNetworkController: {},
        BridgeController: {},
        BridgeStatusController: {},
        EarnController: {},
      } as unknown as EngineContext;

      (Engine as unknown as MockEngine).setMockContext(mockContext);

      await persistConfig.storage.setItem(mockKey, mockValue);
      expect(FilesystemStorage.setItem).toHaveBeenCalledWith(
        mockKey,
        mockValue,
        true,
      );
    });

    it('remove item using FilesystemStorage', async () => {
      await persistConfig.storage.removeItem(mockKey);
      expect(FilesystemStorage.removeItem).toHaveBeenCalledWith(mockKey);
    });
  });

  describe('transforms', () => {
    it('have engine transform configured', () => {
      expect(persistConfig.transforms).toHaveLength(3);
      const engineTransform = persistConfig.transforms[0] as Transform<
        unknown,
        unknown
      > & { whitelist?: string[] };
      expect(engineTransform.whitelist).toEqual(['engine']);
    });

    it('have user transform configured', () => {
      const userTransform = persistConfig.transforms[1] as Transform<
        unknown,
        unknown
      > & { whitelist?: string[] };
      expect(userTransform.whitelist).toEqual(['user']);
    });

    it('has onboarding transform configured', () => {
      const onboardingTransform = persistConfig.transforms[2] as Transform<
        unknown,
        unknown
      > & { whitelist?: string[] };
      expect(onboardingTransform.whitelist).toEqual(['onboarding']);
    });

    describe('persistTransform', () => {
      const engineTransform = persistConfig.transforms[0] as Transform<
        unknown,
        unknown
      >;

      it('returns original state for fresh installs', () => {
        const freshState = {
          backgroundState: {},
        };
        const result = engineTransform.in(freshState, 'engine', {});
        expect(result).toEqual(freshState);
      });

      it('returns original state when inboundState is null', () => {
        const result = engineTransform.in(null, 'engine', {});
        expect(result).toBeNull();
      });

      it('returns original state when Engine is not initialized', () => {
        // Engine context is already cleared in beforeEach
        const state = {
          backgroundState: {
            someController: { data: 'test' },
          },
        };
        const result = engineTransform.in(state, 'engine', {});
        expect(result).toEqual(state);
      });

      it('handles non-object controller values', () => {
        const mockContext = {
          KeyringController: {
            metadata: {
              vault: { persist: true, anonymous: false },
              isUnlocked: { persist: false, anonymous: true },
              keyrings: { persist: false, anonymous: false },
              encryptionKey: { persist: false, anonymous: false },
              encryptionSalt: { persist: false, anonymous: false },
            },
          },
        } as unknown as EngineContext;
        (Engine as unknown as MockEngine).setMockContext(mockContext);

        const state = {
          backgroundState: {
            KeyringController: null,
            OtherController: 'string-value',
          },
        };

        const result = engineTransform.in(state, 'engine', {});
        expect(result).toEqual({
          backgroundState: {},
        });
      });

      it('filters controller state based on metadata', () => {
        const mockContext = {
          KeyringController: {
            metadata: {
              vault: { persist: true, anonymous: false },
              isUnlocked: { persist: false, anonymous: true },
              keyrings: { persist: false, anonymous: false },
              encryptionKey: { persist: false, anonymous: false },
              encryptionSalt: { persist: false, anonymous: false },
            },
          },
        } as unknown as EngineContext;
        (Engine as unknown as MockEngine).setMockContext(mockContext);

        const state = {
          backgroundState: {
            KeyringController: {
              vault: 'encrypted-vault-data',
              isUnlocked: true,
              keyrings: ['keyring1', 'keyring2'],
              encryptionKey: 'secret-key',
              encryptionSalt: 'salt-value',
            },
          },
        };

        const result = engineTransform.in(state, 'engine', {});
        expect(result).toEqual({
          backgroundState: {
            KeyringController: {
              vault: 'encrypted-vault-data',
            },
          },
        });
      });

      it('handles multiple controllers with different metadata', () => {
        const mockContext = {
          KeyringController: {
            metadata: {
              vault: { persist: true, anonymous: false },
              isUnlocked: { persist: false, anonymous: true },
              keyrings: { persist: false, anonymous: false },
              encryptionKey: { persist: false, anonymous: false },
              encryptionSalt: { persist: false, anonymous: false },
            },
          },
          PreferencesController: {
            metadata: {
              selectedAddress: { persist: true, anonymous: false },
              identities: { persist: true, anonymous: false },
              frequentRpcList: { persist: true, anonymous: false },
              currentLocale: { persist: true, anonymous: false },
              useBlockie: { persist: true, anonymous: false },
              useCurrencyRateCheck: { persist: true, anonymous: false },
              useTokenDetection: { persist: true, anonymous: false },
              useNftDetection: { persist: true, anonymous: false },
              useCollectibleDetection: { persist: true, anonymous: false },
              useMultiAccountBalanceChecker: {
                persist: true,
                anonymous: false,
              },
              useAddressBarEnsResolution: { persist: true, anonymous: false },
              useTransactionSimulations: { persist: true, anonymous: false },
              useGasFeesInEth: { persist: true, anonymous: false },
              useNonceField: { persist: true, anonymous: false },
              usePhishDetect: { persist: true, anonymous: false },
              useTokenAutodetect: { persist: true, anonymous: false },
            },
          },
        } as unknown as EngineContext;
        (Engine as unknown as MockEngine).setMockContext(mockContext);

        const state = {
          backgroundState: {
            KeyringController: {
              vault: 'encrypted-vault-data',
              isUnlocked: true,
              keyrings: ['keyring1', 'keyring2'],
              encryptionKey: 'secret-key',
              encryptionSalt: 'salt-value',
            },
            PreferencesController: {
              selectedAddress: '0x123',
              identities: { '0x123': { name: 'Account 1' } },
              frequentRpcList: [],
              currentLocale: 'en',
              useBlockie: true,
              useCurrencyRateCheck: true,
              useTokenDetection: true,
              useNftDetection: true,
              useCollectibleDetection: true,
              useMultiAccountBalanceChecker: true,
              useAddressBarEnsResolution: true,
              useTransactionSimulations: true,
              useGasFeesInEth: true,
              useNonceField: true,
              usePhishDetect: true,
              useTokenAutodetect: true,
            },
          },
        };

        const result = engineTransform.in(state, 'engine', {});
        expect(result).toEqual({
          backgroundState: {
            KeyringController: {
              vault: 'encrypted-vault-data',
            },
            PreferencesController: {
              selectedAddress: '0x123',
              identities: { '0x123': { name: 'Account 1' } },
              frequentRpcList: [],
              currentLocale: 'en',
              useBlockie: true,
              useCurrencyRateCheck: true,
              useTokenDetection: true,
              useNftDetection: true,
              useCollectibleDetection: true,
              useMultiAccountBalanceChecker: true,
              useAddressBarEnsResolution: true,
              useTransactionSimulations: true,
              useGasFeesInEth: true,
              useNonceField: true,
              usePhishDetect: true,
              useTokenAutodetect: true,
            },
          },
        });
      });
    });
  });
});
