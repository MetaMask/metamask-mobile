import migrate from './126';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

const migrationVersion = 126;

interface InternalAccounts {
  accounts: Record<string, { id: string; address: string }>;
  selectedAccount?: string;
}

const createValidState = (
  internalAccounts?: InternalAccounts | unknown,
  includeController = true,
) => ({
  engine: {
    backgroundState: {
      ...(includeController && {
        AccountsController: {
          ...(internalAccounts !== undefined && {
            internalAccounts,
          }),
        },
      }),
    },
  },
});

const ACCOUNT_1_ID = 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3';
const ACCOUNT_2_ID = 'e9b38e2b-7d1e-4e5f-8c2a-1a5b3d7e9f01';

const validAccounts = {
  [ACCOUNT_1_ID]: { id: ACCOUNT_1_ID, address: '0xabc' },
  [ACCOUNT_2_ID]: { id: ACCOUNT_2_ID, address: '0xdef' },
};

describe(`Migration ${migrationVersion}: Fix selectedAccount missing or undefined`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('invalid state structure', () => {
    it('returns state if top-level state is invalid', () => {
      const result = migrate('invalid');
      expect(result).toBe('invalid');
    });

    it('captures exception and returns state if AccountsController is missing', () => {
      const state = createValidState(undefined, false);
      const result = migrate(state);

      expect(result).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'AccountsController state is missing or invalid',
          ),
        }),
      );
    });

    it('captures exception and returns state if AccountsController is not an object', () => {
      const state = {
        engine: {
          backgroundState: {
            AccountsController: 'invalid',
          },
        },
      };
      const result = migrate(state);

      expect(result).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'AccountsController state is missing or invalid',
          ),
        }),
      );
    });

    it('captures exception and returns state if internalAccounts is missing', () => {
      const state = createValidState(undefined, true);
      const result = migrate(state);

      expect(result).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'internalAccounts is missing or invalid',
          ),
        }),
      );
    });
  });

  describe('valid selectedAccount (no-op)', () => {
    it('does not modify state when selectedAccount is a valid string', () => {
      const state = createValidState({
        accounts: validAccounts,
        selectedAccount: ACCOUNT_1_ID,
      });
      const result = migrate(state);

      expect(result).toStrictEqual(state);
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('selectedAccount key is missing (JSON.stringify stripped it)', () => {
    it('sets selectedAccount to first account ID when key is absent', () => {
      const internalAccounts = {
        accounts: validAccounts,
      };
      // Simulate JSON roundtrip: key was stripped
      delete (internalAccounts as Record<string, unknown>).selectedAccount;

      const state = createValidState(internalAccounts);
      const result = migrate(state) as ReturnType<typeof createValidState>;
      const resultAccounts = result.engine.backgroundState
        .AccountsController as Record<string, unknown>;
      const resultInternal = resultAccounts.internalAccounts as Record<
        string,
        unknown
      >;

      expect(resultInternal.selectedAccount).toBe(ACCOUNT_1_ID);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('key_missing'),
        }),
      );
    });

    it('sets selectedAccount to empty string when key is absent and no accounts exist', () => {
      const internalAccounts = {
        accounts: {},
      };
      delete (internalAccounts as Record<string, unknown>).selectedAccount;

      const state = createValidState(internalAccounts);
      const result = migrate(state) as ReturnType<typeof createValidState>;
      const resultAccounts = result.engine.backgroundState
        .AccountsController as Record<string, unknown>;
      const resultInternal = resultAccounts.internalAccounts as Record<
        string,
        unknown
      >;

      expect(resultInternal.selectedAccount).toBe('');
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('key_missing'),
        }),
      );
    });
  });

  describe('selectedAccount is explicitly undefined', () => {
    it('sets selectedAccount to first account ID when value is undefined', () => {
      const state = createValidState({
        accounts: validAccounts,
        selectedAccount: undefined,
      });
      const result = migrate(state) as ReturnType<typeof createValidState>;
      const resultAccounts = result.engine.backgroundState
        .AccountsController as Record<string, unknown>;
      const resultInternal = resultAccounts.internalAccounts as Record<
        string,
        unknown
      >;

      expect(resultInternal.selectedAccount).toBe(ACCOUNT_1_ID);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('selectedAccount is corrupt'),
        }),
      );
    });
  });

  describe('selectedAccount is wrong type', () => {
    it('sets selectedAccount to first account ID when value is a number', () => {
      const state = createValidState({
        accounts: validAccounts,
        selectedAccount: 42,
      });
      const result = migrate(state) as ReturnType<typeof createValidState>;
      const resultAccounts = result.engine.backgroundState
        .AccountsController as Record<string, unknown>;
      const resultInternal = resultAccounts.internalAccounts as Record<
        string,
        unknown
      >;

      expect(resultInternal.selectedAccount).toBe(ACCOUNT_1_ID);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('wrong_type_number'),
        }),
      );
    });

    it('sets selectedAccount to first account ID when value is null', () => {
      const state = createValidState({
        accounts: validAccounts,
        selectedAccount: null,
      });
      const result = migrate(state) as ReturnType<typeof createValidState>;
      const resultAccounts = result.engine.backgroundState
        .AccountsController as Record<string, unknown>;
      const resultInternal = resultAccounts.internalAccounts as Record<
        string,
        unknown
      >;

      expect(resultInternal.selectedAccount).toBe(ACCOUNT_1_ID);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('wrong_type_object'),
        }),
      );
    });
  });

  describe('selectedAccount is empty string', () => {
    it('does not modify state when selectedAccount is empty string (AccountsController handles this)', () => {
      const state = createValidState({
        accounts: validAccounts,
        selectedAccount: '',
      });
      const result = migrate(state) as ReturnType<typeof createValidState>;
      const resultAccounts = result.engine.backgroundState
        .AccountsController as Record<string, unknown>;
      const resultInternal = resultAccounts.internalAccounts as Record<
        string,
        unknown
      >;

      expect(resultInternal.selectedAccount).toBe(ACCOUNT_1_ID);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('empty_string'),
        }),
      );
    });
  });

  describe('fallback to empty string', () => {
    it('sets selectedAccount to empty string when accounts have invalid structure', () => {
      const state = createValidState({
        accounts: { 'bad-id': { notAnId: true } },
        selectedAccount: undefined,
      });
      const result = migrate(state) as ReturnType<typeof createValidState>;
      const resultAccounts = result.engine.backgroundState
        .AccountsController as Record<string, unknown>;
      const resultInternal = resultAccounts.internalAccounts as Record<
        string,
        unknown
      >;

      expect(resultInternal.selectedAccount).toBe('');
    });

    it('sets selectedAccount to empty string when first account id is empty', () => {
      const state = createValidState({
        accounts: { 'bad-id': { id: '' } },
        selectedAccount: undefined,
      });
      const result = migrate(state) as ReturnType<typeof createValidState>;
      const resultAccounts = result.engine.backgroundState
        .AccountsController as Record<string, unknown>;
      const resultInternal = resultAccounts.internalAccounts as Record<
        string,
        unknown
      >;

      expect(resultInternal.selectedAccount).toBe('');
    });
  });
});
