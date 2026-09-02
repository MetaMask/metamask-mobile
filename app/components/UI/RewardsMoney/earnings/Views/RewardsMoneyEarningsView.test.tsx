import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import type {
  EarningOriginType,
  EarningsSummaryDto,
  EarningsSummaryTotals,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import useEarningsSummary from '../hooks/useEarningsSummary';
import useEarningsLedger from '../hooks/useEarningsLedger';
import RewardsMoneyEarningsView from './RewardsMoneyEarningsView';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: { originTypes?: EarningOriginType[] } = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../hooks/useEarningsSummary', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../hooks/useEarningsLedger', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

const mockedUseSummary = jest.mocked(useEarningsSummary);
const mockedUseLedger = jest.mocked(useEarningsLedger);

const createTotals = (
  overrides: Partial<EarningsSummaryTotals> = {},
): EarningsSummaryTotals => ({
  lifetime: '0',
  claimable: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  blocking_reason: null,
  ...overrides,
});

const createSummary = (
  overrides: Partial<EarningsSummaryDto> = {},
): EarningsSummaryDto => ({
  lifetime_total: '32000000',
  claimable: '12500000',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  minimum_musd_base_units: '10000000',
  by_earning_origin_type: {
    CASHBACK: createTotals({ claimable: '12500000' }),
  },
  ...overrides,
});

const mockLedgerState = (overrides = {}) => {
  mockedUseLedger.mockReturnValue({
    entries: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    error: null,
    loadMore: jest.fn(),
    refresh: jest.fn(),
    retry: jest.fn(),
    isRefreshing: false,
    ...overrides,
  });
};

const mockSummaryState = (overrides = {}) => {
  mockedUseSummary.mockReturnValue({
    summary: createSummary(),
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    ...overrides,
  });
};

describe('RewardsMoneyEarningsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockSummaryState();
    mockLedgerState();
  });

  it('scopes the summary and the ledger to the same origin types', () => {
    render(<RewardsMoneyEarningsView originTypes={['CASHBACK']} />);

    expect(mockedUseSummary).toHaveBeenCalledWith(['CASHBACK']);
    expect(mockedUseLedger).toHaveBeenCalledWith(['CASHBACK']);
  });

  it('takes the scope from route params when no prop is given', () => {
    mockRouteParams = { originTypes: ['REFERRAL_REV_SHARE'] };

    render(<RewardsMoneyEarningsView />);

    expect(mockedUseSummary).toHaveBeenCalledWith(['REFERRAL_REV_SHARE']);
  });

  it('falls back to the referrer scope when neither prop nor param is set', () => {
    render(<RewardsMoneyEarningsView />);

    expect(mockedUseSummary).toHaveBeenCalledWith([
      'CASHBACK',
      'REFERRAL_REV_SHARE',
    ]);
  });

  it('opens the claim sheet with the scope only, never a frozen summary', () => {
    render(<RewardsMoneyEarningsView originTypes={['CASHBACK']} />);

    fireEvent.press(screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_CTA));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_MONEY_CLAIM_SHEET,
      { originTypes: ['CASHBACK'] },
    );
  });

  it('disables the claim CTA when nothing is claimable', () => {
    mockSummaryState({
      summary: createSummary({
        claimable: '0',
        by_earning_origin_type: { CASHBACK: createTotals() },
      }),
    });

    render(<RewardsMoneyEarningsView originTypes={['CASHBACK']} />);

    expect(screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_CTA)).toBeDisabled();
  });

  it('hides the code-performance tab for a cashback-only scope', () => {
    render(<RewardsMoneyEarningsView originTypes={['CASHBACK']} />);

    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_TABS),
    ).not.toBeOnTheScreen();
  });

  it('shows the code-performance tab for a referrer scope', () => {
    render(
      <RewardsMoneyEarningsView
        originTypes={['CASHBACK', 'REFERRAL_REV_SHARE']}
      />,
    );

    expect(
      screen.getByTestId(
        `${REWARDS_MONEY_TEST_IDS.EARNINGS_TABS}-code-performance`,
      ),
    ).toBeOnTheScreen();
  });

  it('swaps in the placeholder when the code-performance tab is selected', () => {
    render(
      <RewardsMoneyEarningsView
        originTypes={['CASHBACK', 'REFERRAL_REV_SHARE']}
      />,
    );

    fireEvent.press(
      screen.getByTestId(
        `${REWARDS_MONEY_TEST_IDS.EARNINGS_TABS}-code-performance`,
      ),
    );

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_TAB_PLACEHOLDER),
    ).toBeOnTheScreen();
  });

  it('renders its own header when it is the screen rather than embedded', () => {
    render(<RewardsMoneyEarningsView originTypes={['CASHBACK']} />);

    fireEvent.press(screen.getByTestId('rewards-money-earnings-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('omits the header when embedded in the merged referee screen', () => {
    render(<RewardsMoneyEarningsView originTypes={['CASHBACK']} embedded />);

    expect(
      screen.queryByTestId('rewards-money-earnings-back-button'),
    ).not.toBeOnTheScreen();
  });

  it('refreshes both the summary and the ledger on pull-to-refresh', () => {
    const refreshSummary = jest.fn();
    const refreshLedger = jest.fn();
    mockSummaryState({ refresh: refreshSummary });
    mockLedgerState({ refresh: refreshLedger });
    render(<RewardsMoneyEarningsView originTypes={['CASHBACK']} />);

    fireEvent(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.LEDGER_LIST),
      'refresh',
    );

    expect(refreshSummary).toHaveBeenCalledTimes(1);
    expect(refreshLedger).toHaveBeenCalledTimes(1);
  });
});
