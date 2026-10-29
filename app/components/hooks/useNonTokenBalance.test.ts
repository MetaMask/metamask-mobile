import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  getAccountListBalance,
  useAccountListBalance,
} from './useNonTokenBalance';
import { useBalanceBreakdown } from '../Views/Homepage/BalanceBreakdown/hooks/useBalanceBreakdown';
import { selectSelectedAccountGroup } from '../../selectors/multichainAccounts/accountTreeController';
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
    expect(getBalance()).toBe(1_000);
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
    ).toBe(900);
  });
});

describe('useAccountListBalance', () => {
  it('retains the complete homepage total after switching accounts', () => {
    let selectedAccountGroupId = 'group-main';
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

    expect(result.current('group-main')).toBe(1_088.33);
    expect(result.current('group-other')).toBe(50);
    expect(result.current('group-never-selected')).toBeNull();
  });

  it('retains a non-EVM account group total after switching accounts', () => {
    let selectedAccountGroupId = 'solana-group';

    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroup) {
        return { id: selectedAccountGroupId } as never;
      }
      return undefined as never;
    });
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      hero: hero({ totalFiat: 1_234.56 }),
      slices: {},
    } as BreakdownData);

    const { result, rerender } = renderHook(useAccountListBalance);

    selectedAccountGroupId = 'another-group';
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      hero: hero({ totalFiat: 50 }),
      slices: {},
    } as BreakdownData);
    rerender(undefined);

    expect(result.current('solana-group')).toBe(1_234.56);
  });
});
