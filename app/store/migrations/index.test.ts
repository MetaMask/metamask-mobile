import { migrationList, asyncifyMigrations, MigrationsList } from './';
import {
  MigrationManifest,
  PersistedState,
  createMigrate,
} from 'redux-persist';
import { ControllerStorage } from '../persistConfig';
import { captureException } from '@sentry/react-native';

const defaultNodeEnv = process.env.NODE_ENV;
jest.unmock('redux-persist');
jest.mock('../../store', () => jest.fn());
jest.mock('react-native-default-preference', () => ({
  set: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn().mockReturnValue({}),
}));

// Mock ControllerStorage
jest.mock('../persistConfig', () => ({
  ControllerStorage: {
    getAllPersistedState: jest.fn(),
    setItem: jest.fn(),
  },
}));

// Mock captureException
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

// Only test migrations 25 and up
const migrationNumberToTestFrom = 25;
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {},
    },
  },
  _persist: { version: 0, rehydrated: false },
} as PersistedState;
const numberOfMigrations = Object.keys(migrationList).length;
const recentMigrations = Object.entries(migrationList).reduce(
  (finalState, [migrationNumber, migrationFunction]) => {
    if (Number(migrationNumber) > migrationNumberToTestFrom) {
      finalState[migrationNumber] = migrationFunction;
    }
    return finalState;
  },
  {} as MigrationsList,
);

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const synchronousMigration = (state: any) => {
  state.test = 'sync';
  return state;
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asyncMigration = async (state: any) => {
  state.test = 'async';
  return state;
};

describe('asyncifyMigrations', () => {
  it('should convert synchronous migrations to asynchronous', async () => {
    const testMigrationList = {
      ...recentMigrations,
      [numberOfMigrations]: asyncMigration,
      [numberOfMigrations + 1]: synchronousMigration,
    };

    // Convert all migrations to async
    const asyncMigrations = asyncifyMigrations(testMigrationList);

    // Check that all migrations are Promises
    let isPromiseMigrations = true;
    for (const migrationKey in asyncMigrations) {
      const migratedState = asyncMigrations[migrationKey](initialState);
      if (migratedState.constructor.name !== 'Promise') {
        isPromiseMigrations = false;
        break;
      }
    }

    expect(isPromiseMigrations).toEqual(true);
  });
});

describe('migrations', () => {
  beforeAll(() => {
    // Used by redux-persist library to function properly
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });
  afterAll(() => {
    // Reset to default value
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: defaultNodeEnv,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  it('should migrate successfully when latest migration is synchronous', async () => {
    const testMigrationList = {
      ...recentMigrations,
      [numberOfMigrations]: synchronousMigration,
    };

    // Convert all migrations to async
    const asyncifiedMigrations = asyncifyMigrations(
      testMigrationList,
    ) as unknown as MigrationManifest;

    // Perform migration
    const migratedStatePromise = createMigrate(asyncifiedMigrations);

    // Resolve migration
    const migratedState = await migratedStatePromise(
      initialState,
      numberOfMigrations,
    );

    expect((migratedState as Record<string, unknown>).test).toEqual('sync');
  });

  it('should migrate successfully when latest migration is asynchronous', async () => {
    const testMigrationList = {
      ...recentMigrations,
      [numberOfMigrations]: asyncMigration,
    };

    // Convert all migrations to async
    const asyncifiedMigrations = asyncifyMigrations(
      testMigrationList,
    ) as unknown as MigrationManifest;

    // Perform migration
    const migratedStatePromise = createMigrate(asyncifiedMigrations);

    // Resolve migration
    const migratedState = await migratedStatePromise(
      initialState,
      numberOfMigrations,
    );

    expect((migratedState as Record<string, unknown>).test).toEqual('async');
  });

  it('should migrate successfully when using both synchronous and asynchronous migrations', async () => {
    const testMigrationList = {
      ...recentMigrations,
      [numberOfMigrations]: asyncMigration,
      [numberOfMigrations + 1]: synchronousMigration,
      [numberOfMigrations + 2]: asyncMigration,
      [numberOfMigrations + 3]: synchronousMigration,
    };

    // Convert migrations to async
    const asyncifiedMigrations = asyncifyMigrations(testMigrationList);

    // Perform migration
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const migratedStatePromise = createMigrate(asyncifiedMigrations as any);

    // Resolve migration
    const migratedState = await migratedStatePromise(
      initialState,
      numberOfMigrations + 3,
    );

    expect((migratedState as Record<string, unknown>).test).toEqual('sync');
  });
});

describe('Critical Error Handling', () => {
  const mockedControllerStorage = jest.mocked(ControllerStorage);
  const mockedCaptureException = jest.mocked(captureException);

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all ControllerStorage mocks to successful defaults
    mockedControllerStorage.getAllPersistedState.mockResolvedValue({});
    mockedControllerStorage.setItem.mockResolvedValue();
  });

  describe('inflateFromControllers error handling', () => {
    it('should crash when ControllerStorage.getAllPersistedState fails', async () => {
      // Arrange
      const storageError = new Error('Storage access failed');
      mockedControllerStorage.getAllPersistedState.mockRejectedValue(
        storageError,
      );

      const testMigrationList = {
        105: (state: unknown) => state, // Migration > 104 triggers inflation logic
      };

      const asyncMigrations = asyncifyMigrations(testMigrationList);

      // Act & Assert
      await expect(asyncMigrations['105'](initialState)).rejects.toThrow(
        'Critical: Failed to load controller data for migration. Cannot continue safely as migrations may corrupt data without complete state. App will restart to attempt recovery. Error: Error: Storage access failed',
      );

      // Verify error was captured
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          'inflateFromControllers: Critical error loading controller data: Error: Storage access failed',
        ),
      );
    });

    it('should not crash when no controllers are found (empty state)', async () => {
      // Arrange
      mockedControllerStorage.getAllPersistedState.mockResolvedValue({});

      const testMigrationList = {
        105: (state: unknown) => ({ ...(state as object), test: 'passed' }),
      };

      const asyncMigrations = asyncifyMigrations(testMigrationList);

      // Act
      const result = await asyncMigrations['105'](initialState);

      // Assert
      expect((result as Record<string, unknown>).test).toEqual('passed');
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('deflateToControllersAndStrip error handling', () => {
    it('should crash when any controller fails to save during deflation', async () => {
      // Arrange
      const stateWithControllers = {
        ...initialState,
        engine: {
          backgroundState: {
            TestController: { test: 'data' },
            AnotherController: { another: 'data' },
          },
        },
      };

      // Mock successful getAllPersistedState for inflation
      mockedControllerStorage.getAllPersistedState.mockResolvedValue({
        backgroundState: {
          TestController: { test: 'data' },
          AnotherController: { another: 'data' },
        },
      });

      // Mock setItem to fail for one controller
      const saveError = new Error('Disk full');
      mockedControllerStorage.setItem.mockImplementation((key: string) => {
        if (key === 'persist:TestController') {
          return Promise.reject(saveError);
        }
        return Promise.resolve();
      });

      const testMigrationList = {
        105: (state: unknown) => state, // This will trigger deflation after migration
      };

      const asyncMigrations = asyncifyMigrations(testMigrationList);

      // Act & Assert
      await expect(
        asyncMigrations['105'](stateWithControllers),
      ).rejects.toThrow(
        "Critical: Migration failed for controller 'TestController'. Cannot continue with partial migration as this would corrupt user data. App will restart to attempt recovery. Error: Error: Disk full",
      );

      // Verify error was captured for the failed controller
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          'deflateToControllersAndStrip: Failed to save TestController to individual storage: Error: Disk full',
        ),
      );
    });

    it('should successfully deflate when all controllers save successfully', async () => {
      // Arrange
      const stateWithControllers = {
        ...initialState,
        engine: {
          backgroundState: {
            TestController: { test: 'data' },
            AnotherController: { another: 'data' },
          },
        },
      };

      // Mock successful getAllPersistedState for inflation
      mockedControllerStorage.getAllPersistedState.mockResolvedValue({
        backgroundState: {
          TestController: { test: 'data' },
          AnotherController: { another: 'data' },
        },
      });

      // Mock successful setItem for all controllers
      mockedControllerStorage.setItem.mockResolvedValue();

      const testMigrationList = {
        105: (state: unknown) => ({ ...(state as object), migrated: true }),
      };

      const asyncMigrations = asyncifyMigrations(testMigrationList);

      // Act
      const result = (await asyncMigrations['105'](
        stateWithControllers,
      )) as Record<string, unknown>;

      // Assert
      expect(result.engine).toBeUndefined(); // Engine slice should be stripped
      expect(result.migrated).toBe(true); // Migration should have run
      expect(mockedControllerStorage.setItem).toHaveBeenCalledTimes(2); // Both controllers saved
      expect(mockedCaptureException).not.toHaveBeenCalled(); // No errors captured
    });

    it('should crash when deflation fails completely', async () => {
      // Arrange
      const stateWithControllers = {
        ...initialState,
        engine: {
          backgroundState: {
            TestController: { test: 'data' },
          },
        },
      };

      // Mock successful inflation
      mockedControllerStorage.getAllPersistedState.mockResolvedValue({
        backgroundState: {
          TestController: { test: 'data' },
        },
      });

      // Mock setItem to throw a catastrophic error
      const catastrophicError = new Error('File system corrupted');
      mockedControllerStorage.setItem.mockRejectedValue(catastrophicError);

      const testMigrationList = {
        105: (state: unknown) => state,
      };

      const asyncMigrations = asyncifyMigrations(testMigrationList);

      // Act & Assert
      await expect(
        asyncMigrations['105'](stateWithControllers),
      ).rejects.toThrow(
        "Critical: Migration failed for controller 'TestController'. Cannot continue with partial migration as this would corrupt user data. App will restart to attempt recovery. Error: Error: File system corrupted",
      );

      // Verify both the controller-specific and general errors were captured
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          'deflateToControllersAndStrip: Failed to save TestController to individual storage: Error: File system corrupted',
        ),
      );
    });
  });

  describe('Migration flow integration', () => {
    it('should not trigger inflation/deflation for migrations <= 104', async () => {
      // Arrange
      const testMigrationList = {
        104: (state: unknown) => ({
          ...(state as object),
          test: 'migration104',
        }),
      };

      const asyncMigrations = asyncifyMigrations(testMigrationList);

      // Act
      const result = await asyncMigrations['104'](initialState);

      // Assert
      expect((result as Record<string, unknown>).test).toEqual('migration104');
      expect(
        mockedControllerStorage.getAllPersistedState,
      ).not.toHaveBeenCalled();
      expect(mockedControllerStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle mixed migration versions correctly', async () => {
      // Arrange - Reset all mocks to clean state
      jest.clearAllMocks();
      mockedControllerStorage.getAllPersistedState.mockResolvedValue({});
      mockedControllerStorage.setItem.mockResolvedValue(); // Reset to successful state

      // Use state without controllers to avoid deflation logic
      const stateWithoutControllers = {
        _persist: { version: 0, rehydrated: false },
      } as PersistedState;

      const testMigrationList = {
        103: (state: unknown) => ({ ...(state as object), step103: true }),
        104: (state: unknown) => ({ ...(state as object), step104: true }),
        105: (state: unknown) => ({ ...(state as object), step105: true }),
      };

      const asyncMigrations = asyncifyMigrations(testMigrationList);

      // Act - Run migrations in sequence
      let state = stateWithoutControllers;
      state = (await asyncMigrations['103'](state)) as PersistedState;
      state = (await asyncMigrations['104'](state)) as PersistedState;
      const finalState = await asyncMigrations['105'](state);

      // Assert
      expect((finalState as Record<string, unknown>).step103).toBe(true);
      expect((finalState as Record<string, unknown>).step104).toBe(true);
      expect((finalState as Record<string, unknown>).step105).toBe(true);

      // Inflation should only be called once for migration 105
      expect(
        mockedControllerStorage.getAllPersistedState,
      ).toHaveBeenCalledTimes(1);
      // SetItem should not be called since there are no controllers to deflate
      expect(mockedControllerStorage.setItem).not.toHaveBeenCalled();
    });
  });
});