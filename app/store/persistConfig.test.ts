import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../util/device';
import persistConfig from './persistConfig';
import { version } from './migrations';
import Engine from '../core/Engine';
import { Transform } from 'redux-persist';
import { EngineContext } from '../core/Engine/types';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('redux-persist-filesystem-storage');
jest.mock('../util/device');
jest.mock('../util/Logger');

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
        'onboarding',
        'rpcEvents',
        'accounts',
        'confirmationMetrics',
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

    it('not set item if Engine is not initialized', async () => {
      // Engine context is already cleared in beforeEach
      await persistConfig.storage.setItem(mockKey, mockValue);
      expect(FilesystemStorage.setItem).not.toHaveBeenCalled();
    });

    it('remove item using FilesystemStorage', async () => {
      await persistConfig.storage.removeItem(mockKey);
      expect(FilesystemStorage.removeItem).toHaveBeenCalledWith(mockKey);
    });
  });

  describe('transforms', () => {
    it('have engine transform configured', () => {
      expect(persistConfig.transforms).toHaveLength(2);
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
  });
});
