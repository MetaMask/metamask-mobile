import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  getAccountListBalance,
  useAccountListBalance,
} from './useNonTokenBalance';
import { useBalanceBreakdown } from '../Views/Homepage/BalanceBreakdown/hooks/useBalanceBreakdown';
import { selectSelectedAccountGroup } from '../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountByAccountGroupAndScope } from '../../selectors/multichainAccounts/accounts';
import type {
  BreakdownData,
  HeroData,
  SliceKey,
} from '../Views/Homepage/BalanceBreakdown/types';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock(
  '../Views/Homepage/BalanceBreakdown/hooks/useBalanceBreakdown',
  () => ({ useBalanceBreakdown: jest.fn() }),
);

const hero = (overrides: Partial<HeroData> = {}): HeroData => ({
  totalFiat: 1_000,
  userCurrency: 'USD',
  status: 'ready',
  ...overrides,
});

const getBalance = ({
  accountGroupId = 'selected',
  selectedAccountGroupId = 'selected',
  heroData = hero(),
  knownAccountBalance,
}: {
  accountGroupId?: string;
  selectedAccountGroupId?: string;
  heroData?: HeroData;
  knownAccountBalance?: number;
} = {}) =>
  getAccountListBalance({
    hero: heroData,
    knownAccountBalance,
    selectedAccountGroupId,
    accountGroupId,
  });

describe('getAccountListBalance', () => {
  it('uses the homepage aggregate as the selected row total', () => {
    expect(getBalance()).toEqual({ mode: 'total', value: 1_000 });
  });

  it.each([
    hero({ status: 'loading' }),
    hero({ isPartiallyLoaded: true }),
    hero({ hasErroredSlice: true }),
  ])('keeps an incomplete selected row blank', (heroData) => {
    expect(getBalance({ heroData })).toBeNull();
  });

  it('keeps an account blank until it has been selected and fully loaded', () => {
    expect(getBalance({ accountGroupId: 'other' })).toBeNull();
  });

  it('uses the cached complete homepage total for a non-selected row', () => {
    expect(
      getAccountListBalance({
        hero: hero(),
        knownAccountBalance: 900,
        selectedAccountGroupId: 'other',
        accountGroupId: 'previously-selected',
      }),
    ).toEqual({
      mode: 'total',
      value: 900,
    });
  });
});

describe('useAccountListBalance', () => {
  it('retains the complete homepage total after switching accounts', () => {
    let selectedAccountGroupId = 'group-main';
    const addresses: Record<string, string> = {
      'group-main': '0x0000000000000000000000000000000000000001',
      'group-other': '0x0000000000000000000000000000000000000002',
      'group-never-selected': '0x0000000000000000000000000000000000000003',
    };
    const createBreakdown = (
      primitiveValue: number,
      tokenValue: number,
    ): BreakdownData => {
      const values: Record<SliceKey, number> = {
        tokens: tokenValue,
        money: 100,
        perps: primitiveValue,
        predict: primitiveValue,
        defi: primitiveValue,
      };

      return {
        hero: hero({
          totalFiat: tokenValue + 100 + primitiveValue * 3,
        }),
        slices: Object.fromEntries(
          Object.entries(values).map(([key, valueFiat]) => [
            key,
            {
              key,
              isVisible: true,
              percentOfTotal: 0,
              status: 'ready',
              valueFiat,
            },
          ]),
        ) as BreakdownData['slices'],
      };
    };

    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroup) {
        return { id: selectedAccountGroupId } as never;
      }
      if (selector === selectInternalAccountByAccountGroupAndScope) {
        return ((_scope: string, accountGroupId: string) => ({
          address: addresses[accountGroupId],
        })) as never;
      }
      return undefined as never;
    });
    jest
      .mocked(useBalanceBreakdown)
      .mockReturnValue(createBreakdown(300, 88.33));

    const { result, rerender } = renderHook(useAccountListBalance);

    selectedAccountGroupId = 'group-other';
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...createBreakdown(0, 50),
      hero: hero({ totalFiat: 50 }),
    });
    rerender(undefined);

    expect(result.current('group-main')).toEqual({
      mode: 'total',
      value: 1_088.33,
    });
    expect(result.current('group-other')).toEqual({
      mode: 'total',
      value: 50,
    });
    expect(result.current('group-never-selected')).toBeNull();
  });
});
