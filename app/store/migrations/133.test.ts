import { cloneDeep } from 'lodash';

import migrate from './133';
import { ensureValidState } from './util';

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

interface PerpsShape {
  engine: {
    backgroundState: {
      PerpsController: {
        accountState: Record<string, unknown>;
      };
    };
  };
}

const getAccountState = (state: unknown): Record<string, unknown> =>
  (state as PerpsShape).engine.backgroundState.PerpsController.accountState;

const getSubAccountBreakdown = (
  state: unknown,
): Record<string, Record<string, unknown>> =>
  getAccountState(state).subAccountBreakdown as Record<
    string,
    Record<string, unknown>
  >;

describe('migration 133', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(ensureValidState).mockReturnValue(true);
  });

  it('does not modify the state when ensureValidState returns false', () => {
    const state = { some: 'state' };
    jest.mocked(ensureValidState).mockReturnValueOnce(false);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged when PerpsController is absent', () => {
    const state = { engine: { backgroundState: {} } };
    const before = cloneDeep(state);

    const result = migrate(state);

    expect(result).toBe(state);
    expect(result).toEqual(before);
  });

  it('returns state unchanged when PerpsController.accountState is absent', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: { activeProvider: 'hyperliquid' },
        },
      },
    };
    const before = cloneDeep(state);

    const result = migrate(state);

    expect(result).toBe(state);
    expect(result).toEqual(before);
  });

  it('maps legacy availableToTradeBalance → spendableBalance and availableBalance → withdrawableBalance (asymmetric)', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            accountState: {
              availableBalance: '10',
              availableToTradeBalance: '100',
              totalBalance: '100',
              marginUsed: '0',
              unrealizedPnl: '0',
              returnOnEquity: '0',
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    migrate(state);

    const acc = getAccountState(state);
    expect(acc.spendableBalance).toBe('100');
    expect(acc.withdrawableBalance).toBe('10');
    expect(acc.totalBalance).toBe('100');
    expect('availableBalance' in acc).toBe(false);
    expect('availableToTradeBalance' in acc).toBe(false);
  });

  it('falls back to availableBalance for spendableBalance when availableToTradeBalance is absent', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            accountState: {
              availableBalance: '25',
              totalBalance: '25',
              marginUsed: '0',
              unrealizedPnl: '0',
              returnOnEquity: '0',
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    migrate(state);

    const acc = getAccountState(state);
    expect(acc.spendableBalance).toBe('25');
    expect(acc.withdrawableBalance).toBe('25');
    expect('availableBalance' in acc).toBe(false);
  });

  it('defaults both new fields to "0" when legacy fields are null or missing — no NaN downstream', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            accountState: {
              availableBalance: null,
              totalBalance: '0',
              marginUsed: '0',
              unrealizedPnl: '0',
              returnOnEquity: '0',
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    migrate(state);

    const acc = getAccountState(state);
    expect(acc.spendableBalance).toBe('0');
    expect(acc.withdrawableBalance).toBe('0');
    expect('availableBalance' in acc).toBe(false);
  });

  it('is idempotent — running twice produces the same shape', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            accountState: {
              availableBalance: '10',
              availableToTradeBalance: '100',
              totalBalance: '100',
              marginUsed: '0',
              unrealizedPnl: '0',
              returnOnEquity: '0',
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    migrate(state);
    const firstPass = cloneDeep(getAccountState(state));
    migrate(state);

    expect(getAccountState(state)).toEqual(firstPass);
  });

  it('does not overwrite an already-migrated spendableBalance', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            accountState: {
              spendableBalance: '50',
              withdrawableBalance: '50',
              totalBalance: '50',
              marginUsed: '0',
              unrealizedPnl: '0',
              returnOnEquity: '0',
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    migrate(state);

    const acc = getAccountState(state);
    expect(acc.spendableBalance).toBe('50');
    expect(acc.withdrawableBalance).toBe('50');
  });

  it('migrates subAccountBreakdown entries symmetrically from legacy availableBalance', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            accountState: {
              availableBalance: '10',
              availableToTradeBalance: '100',
              totalBalance: '100',
              marginUsed: '0',
              unrealizedPnl: '0',
              returnOnEquity: '0',
              subAccountBreakdown: {
                '': { availableBalance: '7', totalBalance: '7' },
                xyz: { availableBalance: '3', totalBalance: '3' },
              },
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    migrate(state);

    const breakdown = getSubAccountBreakdown(state);
    expect(breakdown['']).toEqual({
      spendableBalance: '7',
      withdrawableBalance: '7',
      totalBalance: '7',
    });
    expect(breakdown.xyz).toEqual({
      spendableBalance: '3',
      withdrawableBalance: '3',
      totalBalance: '3',
    });
  });

  it('defaults subAccountBreakdown entries to "0" when legacy field is missing or non-string', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            accountState: {
              availableBalance: '10',
              totalBalance: '10',
              marginUsed: '0',
              unrealizedPnl: '0',
              returnOnEquity: '0',
              subAccountBreakdown: {
                '': { availableBalance: null, totalBalance: '5' },
                xyz: { totalBalance: '0' },
              },
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    migrate(state);

    const breakdown = getSubAccountBreakdown(state);
    expect(breakdown['']).toEqual({
      spendableBalance: '0',
      withdrawableBalance: '0',
      totalBalance: '5',
    });
    expect(breakdown.xyz).toEqual({
      spendableBalance: '0',
      withdrawableBalance: '0',
      totalBalance: '0',
    });
  });
});
