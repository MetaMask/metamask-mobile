import migrate, { migrationVersion } from './116';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe(`Migration ${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns state unchanged if state is invalid', () => {
    const invalidState = null;
    const result = migrate(invalidState);
    expect(result).toBe(invalidState);
  });

  it('returns state unchanged if engine is missing', () => {
    const invalidState = { foo: 'bar' };
    const result = migrate(invalidState);
    expect(result).toStrictEqual(invalidState);
  });

  it('returns state unchanged if backgroundState is missing', () => {
    const state = { engine: {} };
    const result = migrate(state);
    expect(result).toStrictEqual(state);
  });

  it('returns state unchanged if RampsController is missing', () => {
    const state = {
      engine: {
        backgroundState: {},
      },
    };
    const result = migrate(state);
    expect(result).toStrictEqual(state);
  });

  it('returns state unchanged if RampsController is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: 'invalid',
        },
      },
    };
    const result = migrate(state);
    expect(result).toStrictEqual(state);
  });

  it('migrates string userRegion to null so controller will geolocate', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            userRegion: 'us-ca',
            providers: [],
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(result.engine.backgroundState.RampsController.userRegion).toBeNull();
    expect(
      result.engine.backgroundState.RampsController.providers,
    ).toStrictEqual([]);
  });

  it('migrates ResourceState userRegion to .data (UserRegion | null)', () => {
    const existingData = { country: {}, state: null, regionCode: 'us-ca' };
    const existingUserRegion = {
      data: existingData,
      selected: null,
      isLoading: false,
      error: null,
    };
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            userRegion: existingUserRegion,
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(result.engine.backgroundState.RampsController.userRegion).toBe(
      existingData,
    );
  });

  it('leaves RampsController unchanged when userRegion is absent', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            providers: [],
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(result).toStrictEqual(state);
  });
});
