import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './154';
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
  authenticationController?: Record<string, unknown>,
): TestState {
  return {
    engine: {
      backgroundState: {
        ...(authenticationController !== undefined
          ? { AuthenticationController: authenticationController }
          : {}),
        OtherController: { preserved: true },
      },
      preserved: true,
    },
    preserved: true,
  };
}

describe(`Migration ${migrationVersion}: Reset AuthenticationController needsSocialPairing`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(154);
  });

  it('sets needsSocialPairing to true when it was false and keeps other fields', () => {
    const state = buildValidState({
      isSignedIn: true,
      needsProfilePairing: false,
      needsSocialPairing: false,
      srpSessionData: { id: { accessToken: 'token' } },
    });

    const result = migrate(state) as TestState;

    expect(
      result.engine.backgroundState.AuthenticationController,
    ).toStrictEqual({
      isSignedIn: true,
      needsProfilePairing: false,
      needsSocialPairing: true,
      srpSessionData: { id: { accessToken: 'token' } },
    });
    expect(result.engine.backgroundState.OtherController).toStrictEqual({
      preserved: true,
    });
    expect(result.engine.preserved).toBe(true);
    expect(result.preserved).toBe(true);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('sets needsSocialPairing to true when the field is absent', () => {
    const state = buildValidState({ isSignedIn: false });

    const result = migrate(state) as TestState;

    expect(
      result.engine.backgroundState.AuthenticationController,
    ).toStrictEqual({ isSignedIn: false, needsSocialPairing: true });
  });

  it('keeps needsSocialPairing true when it is already true', () => {
    const state = buildValidState({ needsSocialPairing: true });

    const result = migrate(state) as TestState;

    expect(
      result.engine.backgroundState.AuthenticationController,
    ).toStrictEqual({ needsSocialPairing: true });
  });

  it('does not change state when AuthenticationController is absent', () => {
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

  it('returns state unchanged when AuthenticationController is not an object', () => {
    const state = {
      engine: { backgroundState: { AuthenticationController: 'invalid' } },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
