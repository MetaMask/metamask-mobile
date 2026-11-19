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

const createState = (cardController: Record<string, unknown> | undefined) => ({
  engine: {
    backgroundState: {
      ...(cardController ? { CardController: cardController } : {}),
      OtherController: { preserved: true },
    },
  },
});

describe(`Migration ${migrationVersion}: drop the legacy cardholder label`, () => {
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
    expect(mockedEnsureValidState).toHaveBeenCalledWith(state, 163);
  });

  it('returns state unchanged when CardController is missing', () => {
    const state = createState(undefined);

    expect(migrate(state)).toBe(state);
  });

  it('deletes cardholderAccounts and cardLinksSeeded and keeps the rest', () => {
    const state = createState({
      cardholderAccounts: ['eip155:0:0xabc'],
      cardLinksSeeded: true,
      cardLinks: [],
      isAuthenticated: true,
    });

    expect(migrate(state)).toStrictEqual(
      createState({
        cardLinks: [],
        isAuthenticated: true,
      }),
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves CardController unchanged when those keys are already gone', () => {
    const state = createState({
      cardLinks: null,
      isAuthenticated: false,
    });

    expect(migrate(state)).toStrictEqual(state);
  });
});
