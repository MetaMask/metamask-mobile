import {
  getAccountListNonTokenBalance,
  getNonTokenBalances,
  type NonTokenSliceKey,
} from './useNonTokenBalance';
import type { BalanceSlice } from '../types';

const createSlice = (
  key: NonTokenSliceKey,
  valueFiat: number,
  status: BalanceSlice['status'] = 'ready',
): BalanceSlice => ({
  key,
  isVisible: true,
  valueFiat,
  status,
});

const createSlices = (
  overrides: Partial<Record<NonTokenSliceKey, Partial<BalanceSlice>>> = {},
): Record<NonTokenSliceKey, BalanceSlice> => {
  const keys: NonTokenSliceKey[] = ['money', 'perps', 'predict', 'defi'];
  const defaults = keys.reduce(
    (slices, key) => ({
      ...slices,
      [key]: createSlice(key, 0, 'ineligible'),
    }),
    {} as Record<NonTokenSliceKey, BalanceSlice>,
  );

  return keys.reduce(
    (slices, key) => ({
      ...slices,
      [key]: { ...slices[key], ...overrides[key] },
    }),
    defaults,
  );
};

describe('getNonTokenBalances', () => {
  it('separates the global Money balance from selected-account primitives', () => {
    const slices = createSlices({
      money: { valueFiat: 100, status: 'ready' },
      perps: { valueFiat: 200, status: 'ready' },
      predict: { valueFiat: 300, status: 'ready' },
      defi: { valueFiat: 400, status: 'ready' },
    });

    expect(getNonTokenBalances(slices)).toEqual({
      moneyBalance: 100,
      accountBalance: 900,
    });
  });

  it('does not return a partial aggregate while a primitive is loading', () => {
    const slices = createSlices({
      money: { valueFiat: 100, status: 'ready' },
      perps: { valueFiat: 200, status: 'loading' },
      predict: { valueFiat: 300, status: 'ready' },
    });

    expect(getNonTokenBalances(slices)).toEqual({
      moneyBalance: 100,
      accountBalance: undefined,
    });
  });

  it('ignores ineligible and errored primitives', () => {
    const slices = createSlices({
      money: { valueFiat: 100, status: 'ready' },
      perps: { valueFiat: 200, status: 'error' },
      predict: { valueFiat: 300, status: 'ineligible' },
    });

    expect(getNonTokenBalances(slices)).toEqual({
      moneyBalance: 100,
      accountBalance: 0,
    });
  });
});

describe('getAccountListNonTokenBalance', () => {
  it('adds Money and selected-account primitives only to the active row', () => {
    expect(
      getAccountListNonTokenBalance({
        moneyBalance: 100,
        accountBalance: 900,
        selectedAccountGroupId: 'group-selected',
        accountGroupId: 'group-selected',
      }),
    ).toBe(1000);
  });

  it('returns Money only for non-selected rows', () => {
    expect(
      getAccountListNonTokenBalance({
        moneyBalance: 100,
        accountBalance: 900,
        selectedAccountGroupId: 'group-selected',
        accountGroupId: 'group-other',
      }),
    ).toBe(100);
  });

  it('returns null while Money is still loading', () => {
    expect(
      getAccountListNonTokenBalance({
        moneyBalance: undefined,
        accountBalance: 900,
        selectedAccountGroupId: 'group-selected',
        accountGroupId: 'group-selected',
      }),
    ).toBeNull();
  });

  it('returns null for the selected row while primitives are loading', () => {
    expect(
      getAccountListNonTokenBalance({
        moneyBalance: 100,
        accountBalance: undefined,
        selectedAccountGroupId: 'group-selected',
        accountGroupId: 'group-selected',
      }),
    ).toBeNull();
  });
});
