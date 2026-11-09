import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './158';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createMoneyAccount = () => ({
  id: 'money-account-id',
  type: 'eip155:eoa',
  address: '0xabcdef1234567890abcdef1234567890abcdef12',
  scopes: ['eip155:0'],
  options: {
    entropy: {
      type: 'mnemonic',
      id: 'entropy-source-1',
      groupIndex: 0,
      derivationPath: "m/44'/4392018'/0'/0",
    },
    exportable: false,
  },
  methods: ['personal_sign'],
});

const createState = (moneyAccountController: unknown) => ({
  engine: {
    backgroundState: {
      MoneyAccountController: moneyAccountController,
      OtherController: { preserved: true },
    },
    preserved: true,
  },
  preserved: true,
});

describe(`Migration ${migrationVersion}: backfill defaultMoneyAccountId`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports migration version 158', () => {
    expect(migrationVersion).toBe(158);
  });

  it('sets defaultMoneyAccountId to the sole money account', () => {
    const state = createState({
      moneyAccounts: {
        'money-account-id': createMoneyAccount(),
      },
    });

    const result = migrate(state) as ReturnType<typeof createState>;

    expect(
      (
        result.engine.backgroundState.MoneyAccountController as {
          defaultMoneyAccountId?: unknown;
        }
      ).defaultMoneyAccountId,
    ).toBe('money-account-id');
  });

  it('preserves unrelated persisted state when backfilling', () => {
    const state = createState({
      moneyAccounts: {
        'money-account-id': createMoneyAccount(),
      },
    });

    const result = migrate(state) as ReturnType<typeof createState>;

    expect(result.preserved).toBe(true);
    expect(result.engine.preserved).toBe(true);
    expect(result.engine.backgroundState.OtherController).toStrictEqual({
      preserved: true,
    });
    expect(
      (
        result.engine.backgroundState.MoneyAccountController as {
          moneyAccounts?: unknown;
        }
      ).moneyAccounts,
    ).toStrictEqual({
      'money-account-id': createMoneyAccount(),
    });
  });

  it('returns the same state when moneyAccounts is empty', () => {
    const state = createState({ moneyAccounts: {} });

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns the same state when defaultMoneyAccountId is already set', () => {
    const state = createState({
      moneyAccounts: {
        'money-account-id': createMoneyAccount(),
      },
      defaultMoneyAccountId: 'money-account-id',
    });

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns the same state when there is more than one money account', () => {
    const state = createState({
      moneyAccounts: {
        'money-account-1': createMoneyAccount(),
        'money-account-2': createMoneyAccount(),
      },
    });

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns the same state when MoneyAccountController is absent', () => {
    const state = {
      engine: {
        backgroundState: {
          OtherController: { preserved: true },
        },
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([null, 'invalid'])(
    'captures an exception when MoneyAccountController is %p',
    (moneyAccountController) => {
      const state = createState(moneyAccountController);

      const result = migrate(state);

      expect(result).toBe(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          `Migration ${migrationVersion}: Invalid MoneyAccountController state: '${typeof moneyAccountController}'`,
        ),
      );
    },
  );

  it('captures an exception when moneyAccounts is missing', () => {
    const state = createState({});

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: Missing moneyAccounts property from MoneyAccountController`,
      ),
    );
  });

  it('captures an exception when moneyAccounts is invalid', () => {
    const state = createState({ moneyAccounts: null });

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: Invalid moneyAccounts state: 'object'`,
      ),
    );
  });

  it('returns the same state when state validation fails', () => {
    const state = createState({
      moneyAccounts: {
        'money-account-id': createMoneyAccount(),
      },
    });
    mockedEnsureValidState.mockReturnValue(false);

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
