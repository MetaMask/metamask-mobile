import { captureException } from '@sentry/react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import migration, { migrationVersion } from './164';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('redux-persist-filesystem-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), removeItem: jest.fn() },
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedGetItem = jest.mocked(FilesystemStorage.getItem);
const mockedRemoveItem = jest.mocked(FilesystemStorage.removeItem);

const LEGACY_KEY = 'persist:MarketingConsentController';

interface TestState {
  engine: {
    backgroundState: Record<string, unknown>;
    preserved?: boolean;
  };
  preserved?: boolean;
}

function buildValidState(
  backgroundState: Record<string, unknown> = {},
): TestState {
  return {
    engine: {
      backgroundState: {
        OtherController: { preserved: true },
        ...backgroundState,
      },
      preserved: true,
    },
    preserved: true,
  };
}

const persistLegacyState = (state: Record<string, unknown>) => {
  mockedGetItem.mockResolvedValue(JSON.stringify(state));
};

describe(`Migration ${migrationVersion}: carry pending marketing consent`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
    mockedGetItem.mockResolvedValue(undefined);
    mockedRemoveItem.mockResolvedValue(undefined);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(164);
  });

  it('carries a pending opt-in into AnalyticsController and keeps other state', async () => {
    persistLegacyState({ pendingMarketingConsent: true });
    const state = buildValidState({
      AnalyticsController: {
        analyticsId: 'analytics-id',
        optedIn: true,
        consentDecisionMade: true,
        optedInToMarketing: false,
        marketingConsentDecisionMade: false,
      },
    });

    const result = (await migration(state)) as TestState;

    expect(result.engine.backgroundState.AnalyticsController).toStrictEqual({
      analyticsId: 'analytics-id',
      optedIn: true,
      consentDecisionMade: true,
      optedInToMarketing: true,
      marketingConsentDecisionMade: true,
      marketingConsentSyncPending: true,
    });
    expect(result.engine.backgroundState.OtherController).toStrictEqual({
      preserved: true,
    });
    expect(result.engine.preserved).toBe(true);
    expect(result.preserved).toBe(true);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('carries a pending opt-out into AnalyticsController', async () => {
    persistLegacyState({ pendingMarketingConsent: false });
    const state = buildValidState({
      AnalyticsController: {
        optedInToMarketing: true,
        marketingConsentDecisionMade: true,
      },
    });

    const result = (await migration(state)) as TestState;

    expect(result.engine.backgroundState.AnalyticsController).toStrictEqual({
      optedInToMarketing: false,
      marketingConsentDecisionMade: true,
      marketingConsentSyncPending: true,
    });
  });

  it('creates AnalyticsController state when it is missing', async () => {
    persistLegacyState({ pendingMarketingConsent: true });
    const state = buildValidState();

    const result = (await migration(state)) as TestState;

    expect(result.engine.backgroundState.AnalyticsController).toStrictEqual({
      optedInToMarketing: true,
      marketingConsentDecisionMade: true,
      marketingConsentSyncPending: true,
    });
  });

  it('leaves state unchanged and keeps the legacy file when nothing is pending', async () => {
    persistLegacyState({ pendingMarketingConsent: null });
    const state = buildValidState({
      AnalyticsController: {
        optedInToMarketing: false,
        marketingConsentDecisionMade: true,
      },
    });
    const snapshot = JSON.stringify(state);

    const result = await migration(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedRemoveItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves state unchanged when the legacy file is absent', async () => {
    const state = buildValidState();
    const snapshot = JSON.stringify(state);

    const result = await migration(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves state unchanged and reports invalid JSON', async () => {
    mockedGetItem.mockResolvedValue('not json');
    const state = buildValidState();
    const snapshot = JSON.stringify(state);

    const result = await migration(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).toHaveBeenCalledTimes(1);
  });

  it('leaves state unchanged and reports a non-object legacy value', async () => {
    mockedGetItem.mockResolvedValue('true');
    const state = buildValidState();
    const snapshot = JSON.stringify(state);

    const result = await migration(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).toHaveBeenCalledTimes(1);
  });

  it('propagates a read failure so the handoff is retried', async () => {
    mockedGetItem.mockRejectedValue(new Error('disk error'));
    const state = buildValidState();

    await expect(migration(state)).rejects.toThrow('disk error');
    expect(mockedCaptureException).toHaveBeenCalledTimes(1);
  });

  it('does not read the legacy file when ensureValidState fails', async () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { invalid: true };

    const result = await migration(state);

    expect(result).toBe(state);
    expect(mockedGetItem).not.toHaveBeenCalled();
  });
});
