import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './135';
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
  };
}

function buildValidState(
  delegationController?: Record<string, unknown>,
): TestState {
  return {
    engine: {
      backgroundState: {
        ...(delegationController !== undefined
          ? { DelegationController: delegationController }
          : {}),
      },
    },
  };
}

describe(`Migration ${migrationVersion}: Strip DelegationController delegations`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(135);
  });

  it('replaces DelegationController state with {} when delegations key exists', () => {
    const state = buildValidState({
      delegations: { '0xabc': { entry: true } },
    });

    const result = migrate(state) as TestState;

    expect(result.engine.backgroundState.DelegationController).toStrictEqual(
      {},
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not change state when DelegationController has no delegations key', () => {
    const state = buildValidState({});

    const snapshot = JSON.stringify(state);
    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not change state when DelegationController is absent', () => {
    const state = buildValidState();
    const snapshot = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = buildValidState({ delegations: {} });

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
