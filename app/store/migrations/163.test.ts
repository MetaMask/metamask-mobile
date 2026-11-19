import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './163';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createState = (user: unknown) => ({
  engine: { backgroundState: {} },
  user,
});

describe(`Migration ${migrationVersion}: reset moneySplashSeen for Rive viewers`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports migration version 163', () => {
    expect(migrationVersion).toBe(163);
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { some: 'state' };

    expect(migrate(state)).toBe(state);
  });

  it('resets moneySplashSeen for users who saw the Rive onboarding', () => {
    const state = createState({
      moneyOnboardingSeen: true,
      moneySplashSeen: true,
    });

    expect(migrate(state)).toStrictEqual(
      createState({ moneyOnboardingSeen: true, moneySplashSeen: false }),
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves users who never saw the Rive onboarding unchanged', () => {
    const state = createState({
      moneyOnboardingSeen: false,
      moneySplashSeen: true,
    });

    expect(migrate(state)).toStrictEqual(
      createState({ moneyOnboardingSeen: false, moneySplashSeen: true }),
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does nothing when the user slice is missing or invalid', () => {
    const missing = { engine: { backgroundState: {} } };
    expect(migrate(missing)).toStrictEqual(missing);

    const invalid = createState('invalid');
    expect(migrate(invalid)).toStrictEqual(invalid);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('reports errors to Sentry and returns state', () => {
    const state = createState({
      moneyOnboardingSeen: true,
      moneySplashSeen: true,
    });
    Object.defineProperty(state.user, 'moneySplashSeen', {
      set() {
        throw new Error('boom');
      },
    });

    expect(migrate(state)).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('boom') }),
    );
  });
});
