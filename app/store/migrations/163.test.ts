import { captureException } from '@sentry/react-native';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
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

const makeBalance = (value: string) => ({
  address: '0x1',
  value,
  currency: 'USD',
  updatedAt: 0,
});

const moneyDeposit = (status: TransactionStatus) => ({
  type: TransactionType.moneyAccountDeposit,
  status,
});

const createState = (
  user: unknown,
  {
    lastKnownBalance,
    transactions = [],
  }: { lastKnownBalance?: unknown; transactions?: unknown[] } = {},
) => ({
  engine: {
    backgroundState: {
      TransactionController: { transactions },
    },
  },
  user,
  ...(lastKnownBalance !== undefined
    ? { moneyBalance: { lastKnownBalance } }
    : {}),
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

  it('resets moneySplashSeen for Rive viewers with no Money activity', () => {
    const state = createState({
      moneyOnboardingSeen: true,
      moneySplashSeen: true,
    });

    expect(migrate(state)).toStrictEqual(
      createState({ moneyOnboardingSeen: true, moneySplashSeen: false }),
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('keeps moneySplashSeen for Rive viewers with a positive balance', () => {
    const state = createState(
      {
        moneyOnboardingSeen: true,
        moneySplashSeen: true,
      },
      { lastKnownBalance: makeBalance('$12.34') },
    );

    expect(migrate(state)).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('resets moneySplashSeen for Rive viewers with a zero balance', () => {
    const state = createState(
      {
        moneyOnboardingSeen: true,
        moneySplashSeen: true,
      },
      { lastKnownBalance: makeBalance('$0.00') },
    );

    expect(migrate(state)).toStrictEqual(
      createState(
        { moneyOnboardingSeen: true, moneySplashSeen: false },
        { lastKnownBalance: makeBalance('$0.00') },
      ),
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('keeps moneySplashSeen for Rive viewers with a confirmed Money deposit', () => {
    const state = createState(
      {
        moneyOnboardingSeen: true,
        moneySplashSeen: true,
      },
      { transactions: [moneyDeposit(TransactionStatus.confirmed)] },
    );

    expect(migrate(state)).toStrictEqual(
      createState(
        { moneyOnboardingSeen: true, moneySplashSeen: true },
        { transactions: [moneyDeposit(TransactionStatus.confirmed)] },
      ),
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('resets moneySplashSeen for Rive viewers with only a pending Money deposit', () => {
    const state = createState(
      {
        moneyOnboardingSeen: true,
        moneySplashSeen: true,
      },
      { transactions: [moneyDeposit(TransactionStatus.submitted)] },
    );

    expect(migrate(state)).toStrictEqual(
      createState(
        { moneyOnboardingSeen: true, moneySplashSeen: false },
        { transactions: [moneyDeposit(TransactionStatus.submitted)] },
      ),
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
