import { captureException } from '@sentry/react-native';
import { DEFAULT_PRO_LAYOUT_PREFERENCES } from '@metamask/perps-controller';
import migrate, { migrationVersion } from './161';
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

describe(`Migration ${migrationVersion}: open the Pro chart by default`, () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('opens a chart that was stored collapsed and keeps the other preferences', () => {
    const state = createState({
      proLayoutPreferences: {
        ...DEFAULT_PRO_LAYOUT_PREFERENCES,
        chartExpanded: false,
        orderBookExpanded: false,
        orderBookPosition: 'left',
        positionsSortField: 'size',
      },
    });

    const migrated = migrate(state) as typeof state;
    const preferences = (
      migrated.engine.backgroundState.PerpsController as {
        proLayoutPreferences: Record<string, unknown>;
      }
    ).proLayoutPreferences;

    expect(preferences.chartExpanded).toBe(true);
    expect(preferences.orderBookExpanded).toBe(false);
    expect(preferences.orderBookPosition).toBe('left');
    expect(preferences.positionsSortField).toBe('size');
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves an already expanded chart expanded', () => {
    const state = createState({
      proLayoutPreferences: {
        ...DEFAULT_PRO_LAYOUT_PREFERENCES,
        chartExpanded: true,
      },
    });

    const migrated = migrate(state) as typeof state;
    const preferences = (
      migrated.engine.backgroundState.PerpsController as {
        proLayoutPreferences: Record<string, unknown>;
      }
    ).proLayoutPreferences;

    expect(preferences.chartExpanded).toBe(true);
  });

  it('leaves state untouched when layout preferences were never stored', () => {
    const state = createState({ isTestnet: false });

    expect(migrate(state)).toStrictEqual(state);
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
    const state = createState({
      proLayoutPreferences: { chartExpanded: false },
    });

    expect(migrate(state)).toStrictEqual(state);
  });
});
