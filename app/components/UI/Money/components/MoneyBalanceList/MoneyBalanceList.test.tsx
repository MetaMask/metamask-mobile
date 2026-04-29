import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyBalanceList from './MoneyBalanceList';
import { MoneyBalanceListTestIds } from './MoneyBalanceList.testIds';

const mockUseMusdBalance = jest.fn();

jest.mock('../../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: () => mockUseMusdBalance(),
}));

jest.mock(
  '../../../../../component-library/components/Badges/BadgeWrapper',
  () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => children,
    BadgePosition: { BottomRight: 'BottomRight' },
  }),
);

jest.mock('../../../../../component-library/components/Badges/Badge', () => ({
  __esModule: true,
  default: () => null,
  BadgeVariant: { Network: 'Network' },
}));

jest.mock('../../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: () => 1,
}));

const ZERO_BALANCE_HOOK = {
  hasMusdBalanceOnAnyChain: false,
  hasMusdBalanceOnChain: () => false,
  tokenBalanceByChain: {},
  fiatBalanceByChain: {},
  fiatBalanceFormattedByChain: {},
  tokenBalanceAggregated: '0',
  fiatBalanceAggregated: undefined,
  fiatBalanceAggregatedFormatted: '$0.00',
};

describe('MoneyBalanceList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMusdBalance.mockReturnValue(ZERO_BALANCE_HOOK);
  });

  it('renders the Your balance title', () => {
    const { getByTestId } = render(<MoneyBalanceList />);
    expect(getByTestId(MoneyBalanceListTestIds.TITLE)).toBeOnTheScreen();
  });

  it('renders a single zero-balance row for first-time users', () => {
    const { getAllByTestId } = render(<MoneyBalanceList />);
    expect(getAllByTestId(MoneyBalanceListTestIds.ROW)).toHaveLength(1);
  });

  it('renders one zero-balance row per supported chain for returning users', () => {
    const { getAllByTestId } = render(<MoneyBalanceList isReturningUser />);
    expect(getAllByTestId(MoneyBalanceListTestIds.ROW)).toHaveLength(2);
  });

  it('renders one row per chain that has a positive mUSD balance', () => {
    mockUseMusdBalance.mockReturnValue({
      ...ZERO_BALANCE_HOOK,
      hasMusdBalanceOnAnyChain: true,
      hasMusdBalanceOnChain: (chainId: string) => chainId === '0x1',
      tokenBalanceByChain: { '0x1': '1280.34' },
      fiatBalanceFormattedByChain: { '0x1': '$1,280.34' },
    });

    const { getAllByTestId, getByText } = render(<MoneyBalanceList />);
    expect(getAllByTestId(MoneyBalanceListTestIds.ROW)).toHaveLength(1);
    expect(getByText('$1,280.34')).toBeOnTheScreen();
    expect(getByText(/1,280\.34\s*mUSD/)).toBeOnTheScreen();
  });
});
