import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './140';
import { ensureValidState } from './util';
import { CardEntryPoint } from '../../components/UI/Card/util/metrics';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

interface TestState {
  card?: {
    pendingMoneyAccountCardLink?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

describe(`Migration ${migrationVersion}: Normalize card.pendingMoneyAccountCardLink`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged when ensureValidState returns false', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    expect(migrate(state)).toBe(state);
  });

  it('returns state unchanged when card slice is missing', () => {
    const state = { engine: {} };

    expect(migrate(state)).toBe(state);
  });

  it('returns state unchanged when pendingMoneyAccountCardLink is absent', () => {
    const state: TestState = { card: { hasViewedCardButton: true } };

    migrate(state);

    expect(state.card).not.toHaveProperty('pendingMoneyAccountCardLink');
  });

  it('coerces a stale boolean true to null', () => {
    const state: TestState = { card: { pendingMoneyAccountCardLink: true } };

    migrate(state);

    expect(state.card?.pendingMoneyAccountCardLink).toBeNull();
  });

  it('coerces a stale boolean false to null', () => {
    const state: TestState = { card: { pendingMoneyAccountCardLink: false } };

    migrate(state);

    expect(state.card?.pendingMoneyAccountCardLink).toBeNull();
  });

  it('coerces an unknown string to null', () => {
    const state: TestState = {
      card: { pendingMoneyAccountCardLink: 'GARBAGE_VALUE' },
    };

    migrate(state);

    expect(state.card?.pendingMoneyAccountCardLink).toBeNull();
  });

  it('preserves null', () => {
    const state: TestState = { card: { pendingMoneyAccountCardLink: null } };

    migrate(state);

    expect(state.card?.pendingMoneyAccountCardLink).toBeNull();
  });

  it('preserves a valid CardEntryPoint value', () => {
    const state: TestState = {
      card: {
        pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
      },
    };

    migrate(state);

    expect(state.card?.pendingMoneyAccountCardLink).toBe(
      CardEntryPoint.MONEY_LINK_CARD_SHEET,
    );
  });

  it('captures exceptions and returns state on unexpected errors', () => {
    const card = new Proxy(
      { pendingMoneyAccountCardLink: true } as Record<string, unknown>,
      {
        set() {
          throw new Error('Unexpected migration failure');
        },
      },
    );

    const state: TestState = { card };

    expect(migrate(state)).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          `Migration ${migrationVersion}: Failed to normalize pendingMoneyAccountCardLink`,
        ),
      }),
    );
  });
});
