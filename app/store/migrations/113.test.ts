import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './113';
import { ensureValidState } from './util';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import { STORAGE_KEY_PREFIX } from '@metamask/storage-service';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

describe(`migration #${migrationVersion}`, () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('returns state unchanged if SnapController is not found', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          OtherController: { someData: true },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(oldState);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(`Migration ${migrationVersion}: SnapController not found.`),
    );

    expect(migratedState).toEqual(oldState);
  });

  it('returns state unchanged if SnapController is not an object', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          SnapController: 'not an object',
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(oldState);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: SnapController is not an object: string`,
      ),
    );

    expect(migratedState).toEqual(oldState);
  });

  it('returns state unchanged if SnapController.snaps is not found', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          SnapController: {
            foo: 'bar',
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(oldState);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: SnapController missing property snaps.`,
      ),
    );

    expect(migratedState).toEqual(oldState);
  });

  it('returns state unchanged if SnapController.snaps is not an object', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          SnapController: { snaps: 'not an object' },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(oldState);

    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: SnapController.snaps is not an object: string`,
      ),
    );

    expect(migratedState).toEqual(oldState);
  });

  it('stores the sourceCode in the browser storage and removes it from the SnapController state', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          SnapController: {
            snaps: {
              'mock-snap-id': { sourceCode: 'sourceCode', id: 'mock-snap-id' },
            },
          },
        },
      },
    };

    jest.spyOn(FilesystemStorage, 'setItem').mockResolvedValue(undefined);

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(oldState);

    expect(FilesystemStorage.setItem).toHaveBeenCalledWith(
      `${STORAGE_KEY_PREFIX}SnapController:mock-snap-id`,
      'sourceCode',
      true,
    );

    expect(migratedState).toStrictEqual({
      engine: {
        backgroundState: {
          SnapController: {
            snaps: {
              'mock-snap-id': { id: 'mock-snap-id' },
            },
          },
        },
      },
    });
  });
});
