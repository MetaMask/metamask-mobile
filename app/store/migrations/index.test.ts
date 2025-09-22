import { migrationList, asyncifyMigrations, MigrationsList } from './';
import {
  MigrationManifest,
  PersistedState,
  createMigrate,
} from 'redux-persist';
const defaultNodeEnv = process.env.NODE_ENV;
jest.unmock('redux-persist');
jest.mock('../../store', () => jest.fn());
jest.mock('react-native-default-preference', () => ({
  set: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn().mockReturnValue({}),
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

  it('should only call validation callback after all migrations complete', async () => {
    const mockValidation = jest.fn();
    const testMigrationList = {
      0: synchronousMigration,
      1: asyncMigration,
      2: synchronousMigration,
    };

    // Convert all migrations to async with validation callback
    const asyncMigrations = asyncifyMigrations(
      testMigrationList,
      mockValidation,
    );

    // Run migrations in sequence and verify validation is only called after the highest migration
    let state: PersistedState = initialState;

    for (const migrationKey in asyncMigrations) {
      state = (await asyncMigrations[migrationKey](state)) as PersistedState;

      if (Number(migrationKey) === 2) {
        // Should be called exactly once after the last migration
        expect(mockValidation).toHaveBeenCalledTimes(1);
        expect(mockValidation).toHaveBeenCalledWith(state);
      } else {
        // Should not be called for any other migration
        expect(mockValidation).not.toHaveBeenCalled();
      }
    }
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
