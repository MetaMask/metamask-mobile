import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './153';
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
  security: Record<string, unknown>;
  preserved?: boolean;
}

function buildValidState(
  preference: boolean | null | undefined,
  analyticsController?: Record<string, unknown>,
): TestState {
  return {
    engine: {
      backgroundState: {
        ...(analyticsController !== undefined
          ? { AnalyticsController: analyticsController }
          : {}),
        OtherController: { preserved: true },
      },
      preserved: true,
    },
    security:
      preference === undefined
        ? {}
        : { dataCollectionForMarketing: preference },
    preserved: true,
  };
}

describe(`Migration ${migrationVersion}: Seed AnalyticsController marketing consent`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(153);
  });

  it('seeds an opt-in when the Redux preference is true', () => {
    const result = migrate(buildValidState(true)) as TestState;

    expect(result.engine.backgroundState.AnalyticsController).toStrictEqual({
      optedInToMarketing: true,
      marketingConsentDecisionMade: true,
    });
    expect(result.engine.backgroundState.OtherController).toStrictEqual({
      preserved: true,
    });
    expect(result.preserved).toBe(true);
  });

  it('seeds an opt-out when the Redux preference is false', () => {
    const result = migrate(buildValidState(false)) as TestState;

    expect(result.engine.backgroundState.AnalyticsController).toStrictEqual({
      optedInToMarketing: false,
      marketingConsentDecisionMade: true,
    });
  });

  it('seeds an undecided marketing state when the preference is null', () => {
    const result = migrate(buildValidState(null)) as TestState;

    expect(result.engine.backgroundState.AnalyticsController).toStrictEqual({
      optedInToMarketing: false,
      marketingConsentDecisionMade: false,
    });
  });

  it('seeds an undecided marketing state when the preference is missing', () => {
    const result = migrate(buildValidState(undefined)) as TestState;

    expect(result.engine.backgroundState.AnalyticsController).toStrictEqual({
      optedInToMarketing: false,
      marketingConsentDecisionMade: false,
    });
  });

  it('preserves existing controller marketing consent values', () => {
    const state = buildValidState(true, {
      optedIn: true,
      optedInToMarketing: false,
      marketingConsentDecisionMade: true,
      marketingCampaignCookieId: 'cookie',
    });

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('reseeds both marketing fields from an opt-out when only the opt-in is stored', () => {
    const result = migrate(
      buildValidState(false, {
        optedInToMarketing: true,
        eventsConfig: { version: '2' },
      }),
    ) as TestState;

    expect(result.engine.backgroundState.AnalyticsController).toStrictEqual({
      optedInToMarketing: false,
      eventsConfig: { version: '2' },
      marketingConsentDecisionMade: true,
    });
  });

  it('reseeds both marketing fields from an opt-in when only the decision is stored', () => {
    const result = migrate(
      buildValidState(true, {
        marketingConsentDecisionMade: false,
        eventsConfig: { version: '2' },
      }),
    ) as TestState;

    expect(result.engine.backgroundState.AnalyticsController).toStrictEqual({
      optedInToMarketing: true,
      marketingConsentDecisionMade: true,
      eventsConfig: { version: '2' },
    });
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { invalid: true };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('reports a failure and returns the original state when seeding throws', () => {
    const state = buildValidState(true);
    Object.defineProperty(state, 'security', {
      get() {
        throw new Error('unreadable security state');
      },
    });

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
