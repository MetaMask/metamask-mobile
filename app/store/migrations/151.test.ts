import { captureException } from '@sentry/react-native';
import { DEFAULT_PRO_LAYOUT_PREFERENCES } from '@metamask/perps-controller';
import migrate, { migrationVersion } from './151';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createState = (perpsController: unknown) => ({
  engine: {
    backgroundState: {
      PerpsController: perpsController,
      OtherController: { preserved: true },
    },
    preserved: true,
  },
  preserved: true,
});

describe(`Migration ${migrationVersion}: apply the mobile Pro layout defaults`, () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('overwrites both preferences while preserving the siblings', () => {
    const state = createState({
      proLayoutPreferences: {
        ...DEFAULT_PRO_LAYOUT_PREFERENCES,
        chartExpanded: true,
        positionsSortField: 'size',
      },
    });

    const migrated = migrate(state) as typeof state;
    const preferences = (
      migrated.engine.backgroundState.PerpsController as {
        proLayoutPreferences: Record<string, unknown>;
      }
    ).proLayoutPreferences;

    expect(preferences.orderBookExpanded).toBe(true);
    expect(preferences.orderBookPosition).toBe('right');
    // Untouched by this migration.
    expect(preferences.chartExpanded).toBe(true);
    expect(preferences.positionsSortField).toBe('size');
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('writes the full defaults when the persisted state predates the field', () => {
    // Controller init only seeds the mobile defaults when the whole controller
    // is absent, so these users would otherwise read the Extension defaults.
    const state = createState({ isTestnet: false });

    const migrated = migrate(state) as typeof state;
    const preferences = (
      migrated.engine.backgroundState.PerpsController as {
        proLayoutPreferences: Record<string, unknown>;
      }
    ).proLayoutPreferences;

    expect(preferences).toStrictEqual({
      ...DEFAULT_PRO_LAYOUT_PREFERENCES,
      orderBookExpanded: true,
      orderBookPosition: 'right',
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves state untouched when PerpsController is absent', () => {
    const state = {
      engine: { backgroundState: { OtherController: { preserved: true } } },
    };

    expect(migrate(state)).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures and bails when PerpsController is not an object', () => {
    const state = createState('not-an-object');

    expect(migrate(state)).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: Invalid PerpsController state: 'string'`,
      ),
    );
  });

  it('captures and bails when proLayoutPreferences is not an object', () => {
    const state = createState({ proLayoutPreferences: 'not-an-object' });

    expect(migrate(state)).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: Invalid proLayoutPreferences state: 'string'`,
      ),
    );
  });

  it('returns state unchanged when validation fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = createState({ proLayoutPreferences: {} });

    expect(migrate(state)).toStrictEqual(state);
  });
});
