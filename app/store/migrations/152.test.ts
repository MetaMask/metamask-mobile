import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './152';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

interface TestState {
  engine: {
    backgroundState: Record<string, unknown>;
    preserved?: boolean;
  };
  preserved?: boolean;
}

function buildValidState(
  remoteFeatureFlagController?: Record<string, unknown>,
): TestState {
  return {
    engine: {
      backgroundState: {
        ...(remoteFeatureFlagController !== undefined
          ? { RemoteFeatureFlagController: remoteFeatureFlagController }
          : {}),
        OtherController: { preserved: true },
      },
      preserved: true,
    },
    preserved: true,
  };
}

describe(`Migration ${migrationVersion}: Strip RemoteFeatureFlagController rawRemoteFeatureFlags`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(152);
  });

  it('omits rawRemoteFeatureFlags from persisted RemoteFeatureFlagController state', () => {
    const state = buildValidState({
      remoteFeatureFlags: { otaUpdatesEnabled: true },
      rawRemoteFeatureFlags: { otaUpdatesEnabled: true },
      localOverrides: { testOverride: true },
      cacheTimestamp: 123,
    });

    const result = migrate(state) as TestState;

    expect(
      result.engine.backgroundState.RemoteFeatureFlagController,
    ).toStrictEqual({
      remoteFeatureFlags: { otaUpdatesEnabled: true },
      localOverrides: { testOverride: true },
      cacheTimestamp: 123,
    });
    expect(result.engine.backgroundState.OtherController).toStrictEqual({
      preserved: true,
    });
    expect(result.engine.preserved).toBe(true);
    expect(result.preserved).toBe(true);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not change state when RemoteFeatureFlagController has no rawRemoteFeatureFlags key', () => {
    const state = buildValidState({
      remoteFeatureFlags: {},
      cacheTimestamp: 0,
    });
    const snapshot = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not change state when RemoteFeatureFlagController is absent', () => {
    const state = buildValidState();
    const snapshot = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { invalid: true };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when RemoteFeatureFlagController is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: 'invalid',
        },
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
