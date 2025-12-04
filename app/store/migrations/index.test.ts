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
  it('converts synchronous migrations to asynchronous', async () => {
    const testMigrationList = {
      ...recentMigrations,
      [numberOfMigrations]: asyncMigration,
      [numberOfMigrations + 1]: synchronousMigration,
    };

    const asyncMigrations = asyncifyMigrations(testMigrationList);

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
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: defaultNodeEnv,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  it('completes migration when latest migration is synchronous', async () => {
    const testMigrationList = {
      ...recentMigrations,
      [numberOfMigrations]: synchronousMigration,
    };
    const asyncifiedMigrations = asyncifyMigrations(
      testMigrationList,
    ) as unknown as MigrationManifest;

    const migratedStatePromise = createMigrate(asyncifiedMigrations);
    const migratedState = await migratedStatePromise(
      initialState,
      numberOfMigrations,
    );

    expect((migratedState as Record<string, unknown>).test).toEqual('sync');
  });

  it('completes migration when latest migration is asynchronous', async () => {
    const testMigrationList = {
      ...recentMigrations,
      [numberOfMigrations]: asyncMigration,
    };
    const asyncifiedMigrations = asyncifyMigrations(
      testMigrationList,
    ) as unknown as MigrationManifest;

    const migratedStatePromise = createMigrate(asyncifiedMigrations);
    const migratedState = await migratedStatePromise(
      initialState,
      numberOfMigrations,
    );

    expect((migratedState as Record<string, unknown>).test).toEqual('async');
  });

  it('completes migration when using both synchronous and asynchronous migrations', async () => {
    const testMigrationList = {
      ...recentMigrations,
      [numberOfMigrations]: asyncMigration,
      [numberOfMigrations + 1]: synchronousMigration,
      [numberOfMigrations + 2]: asyncMigration,
      [numberOfMigrations + 3]: synchronousMigration,
    };
    const asyncifiedMigrations = asyncifyMigrations(testMigrationList);
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const migratedStatePromise = createMigrate(asyncifiedMigrations as any);

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
    mockedControllerStorage.getAllPersistedState.mockResolvedValue({});
    mockedControllerStorage.setItem.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('inflateFromControllers error handling', () => {
    it('throws critical error when ControllerStorage.getAllPersistedState fails', async () => {
      const storageError = new Error('Storage access failed');
      mockedControllerStorage.getAllPersistedState.mockRejectedValue(
        storageError,
      );
      const testMigrationList = {
        108: (state: unknown) => state,
      };
      const asyncMigrations = asyncifyMigrations(testMigrationList);

      await expect(asyncMigrations['108'](initialState)).rejects.toThrow(
        'Critical: Failed to load controller data for migration. Cannot continue safely as migrations may corrupt data without complete state. App will restart to attempt recovery. Error: Error: Storage access failed',
      );

      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          'inflateFromControllers: Critical error loading controller data: Error: Storage access failed',
        ),
      );
    });

    it('completes migration when no controllers are found', async () => {
      mockedControllerStorage.getAllPersistedState.mockResolvedValue({});
      const testMigrationList = {
        108: (state: unknown) => ({ ...(state as object), test: 'passed' }),
      };
      const asyncMigrations = asyncifyMigrations(testMigrationList);

      const result = await asyncMigrations['108'](initialState);

      expect((result as Record<string, unknown>).test).toEqual('passed');
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('deflateToControllersAndStrip error handling', () => {
    it('throws critical error when any controller fails to save during deflation', async () => {
      const stateWithControllers = {
        ...initialState,
        engine: {
          backgroundState: {
            TestController: { test: 'data' },
            AnotherController: { another: 'data' },
          },
        },
      };
      mockedControllerStorage.getAllPersistedState.mockResolvedValue({
        backgroundState: {
          TestController: { test: 'data' },
          AnotherController: { another: 'data' },
        },
      });
      const saveError = new Error('Disk full');
      mockedControllerStorage.setItem.mockImplementation((key: string) => {
        if (key === 'persist:TestController') {
          return Promise.reject(saveError);
        }
        return Promise.resolve();
      });
      const testMigrationList = {
        107: (state: unknown) => state,
      };
      const asyncMigrations = asyncifyMigrations(testMigrationList);

      await expect(
        asyncMigrations['107'](stateWithControllers),
      ).rejects.toThrow(
        "Critical: Migration failed for controller 'TestController'. Cannot continue with partial migration as this would corrupt user data. App will restart to attempt recovery. Error: Error: Disk full",
      );

      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          'deflateToControllersAndStrip: Failed to save TestController to individual storage: Error: Disk full',
        ),
      );
    });

    it('saves all controllers and strips engine slice when deflation completes', async () => {
      const stateWithControllers = {
        ...initialState,
        engine: {
          backgroundState: {
            TestController: { test: 'data' },
            AnotherController: { another: 'data' },
          },
        },
      };
      mockedControllerStorage.getAllPersistedState.mockResolvedValue({
        backgroundState: {
          TestController: { test: 'data' },
          AnotherController: { another: 'data' },
        },
      });
      mockedControllerStorage.setItem.mockResolvedValue();
      const testMigrationList = {
        107: (state: unknown) => ({ ...(state as object), migrated: true }),
      };
      const asyncMigrations = asyncifyMigrations(testMigrationList);

      const result = (await asyncMigrations['107'](
        stateWithControllers,
      )) as Record<string, unknown>;

      expect(result.engine).toBeUndefined();
      expect(result.migrated).toBe(true);
      expect(mockedControllerStorage.setItem).toHaveBeenCalledTimes(2);
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('throws critical error when deflation fails catastrophically', async () => {
      const stateWithControllers = {
        ...initialState,
        engine: {
          backgroundState: {
            TestController: { test: 'data' },
          },
        },
      };
      mockedControllerStorage.getAllPersistedState.mockResolvedValue({
        backgroundState: {
          TestController: { test: 'data' },
        },
      });
      const catastrophicError = new Error('File system corrupted');
      mockedControllerStorage.setItem.mockRejectedValue(catastrophicError);
      const testMigrationList = {
        107: (state: unknown) => state,
      };
      const asyncMigrations = asyncifyMigrations(testMigrationList);

      await expect(
        asyncMigrations['107'](stateWithControllers),
      ).rejects.toThrow(
        "Critical: Migration failed for controller 'TestController'. Cannot continue with partial migration as this would corrupt user data. App will restart to attempt recovery. Error: Error: File system corrupted",
      );

      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          'deflateToControllersAndStrip: Failed to save TestController to individual storage: Error: File system corrupted',
        ),
      );
    });
  });

  describe('Migration flow integration', () => {
    it('skips inflation and deflation for migrations before version 107', async () => {
      const testMigrationList = {
        105: (state: unknown) => ({
          ...(state as object),
          test: 'migration105',
        }),
      };
      const asyncMigrations = asyncifyMigrations(testMigrationList);

      const result = await asyncMigrations['105'](initialState);

      expect((result as Record<string, unknown>).test).toEqual('migration105');
      expect(
        mockedControllerStorage.getAllPersistedState,
      ).not.toHaveBeenCalled();
      expect(mockedControllerStorage.setItem).not.toHaveBeenCalled();
    });

    it('runs mixed migration versions in sequence with correct inflation timing', async () => {
      jest.clearAllMocks();
      mockedControllerStorage.getAllPersistedState.mockResolvedValue({});
      mockedControllerStorage.setItem.mockResolvedValue();
      const stateWithoutControllers = {
        _persist: { version: 0, rehydrated: false },
      } as PersistedState;
      const testMigrationList = {
        106: (state: unknown) => ({ ...(state as object), step106: true }),
        107: (state: unknown) => ({ ...(state as object), step107: true }),
        108: (state: unknown) => ({ ...(state as object), step108: true }),
      };
      const asyncMigrations = asyncifyMigrations(testMigrationList);

      let state = stateWithoutControllers;
      state = (await asyncMigrations['106'](state)) as PersistedState;
      state = (await asyncMigrations['107'](state)) as PersistedState;
      const finalState = await asyncMigrations['108'](state);

      expect((finalState as Record<string, unknown>).step106).toBe(true);
      expect((finalState as Record<string, unknown>).step107).toBe(true);
      expect((finalState as Record<string, unknown>).step108).toBe(true);
      expect(
        mockedControllerStorage.getAllPersistedState,
      ).toHaveBeenCalledTimes(1);
      expect(mockedControllerStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
