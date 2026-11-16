import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import {
  useMoneyHistoricalEarnings,
  type InterestHistoryAvailability,
  type InterestHistoryBucket,
  type InterestHistoryRange,
  type InterestHistoryResponse,
} from '../../hooks/useMoneyHistoricalEarnings';
import MoneyEarningsView from './MoneyEarningsView';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const mockGoBack = jest.fn();
const mockUseRoute = jest.fn();
const mockInitiateWithdrawal = jest.fn();
const mockNavigateToMoneyDeposit = jest.fn();
const mockRefetchHistoricalEarnings = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: (): { goBack: typeof mockGoBack } => ({
      goBack: mockGoBack,
    }),
    useRoute: (): unknown => mockUseRoute(),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } => ({ top: 48, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountWithdrawal: jest.fn(),
}));

jest.mock('../../hooks/useMoneyDepositNavigation', () => ({
  useMoneyDepositNavigation: jest.fn(),
}));

jest.mock('../../hooks/useMoneyHistoricalEarnings', () => ({
  useMoneyHistoricalEarnings: jest.fn(),
}));

const mockUseMoneyAccountWithdrawal = jest.mocked(useMoneyAccountWithdrawal);
const mockUseMoneyDepositNavigation = jest.mocked(useMoneyDepositNavigation);
const mockUseMoneyHistoricalEarnings = jest.mocked(useMoneyHistoricalEarnings);

const available: InterestHistoryAvailability = {
  earnings: 'available',
  usd_pricing: 'available',
};

const createBucket = (
  start: string,
  interestEarnedUsd: string | null,
  bucketAvailability: InterestHistoryAvailability = available,
): InterestHistoryBucket => ({
  start,
  end: new Date(Date.parse(start) + 24 * 60 * 60 * 1000).toISOString(),
  period_status: 'complete',
  availability: bucketAvailability,
  unavailable_reasons:
    bucketAvailability.earnings === 'available'
      ? []
      : ['before_user_earnings_inception'],
  interest_earned_musd_assets: interestEarnedUsd,
  interest_earned_usd: interestEarnedUsd,
  musd_price_usd: bucketAvailability.usd_pricing === 'available' ? '1' : null,
  price_as_of: bucketAvailability.usd_pricing === 'available' ? start : null,
  price_source:
    bucketAvailability.usd_pricing === 'available'
      ? 'metamask_price_api'
      : null,
  by_vault: [],
});

const createRange = (
  range: InterestHistoryRange['range'],
  buckets: InterestHistoryBucket[],
  total: string,
): InterestHistoryRange => ({
  range,
  granularity: range === '7d' ? 'day' : range === '30d' ? 'week' : 'month',
  range_start: buckets[0]?.start ?? '2026-10-17T00:00:00.000Z',
  range_end: '2026-11-16T00:00:00.000Z',
  period_status: 'partial',
  availability: available,
  unavailable_reasons: [],
  totals: {
    interest_earned_musd_assets: total,
    interest_earned_usd: total,
  },
  buckets,
});

const historicalEarnings: InterestHistoryResponse = {
  address: '0x1234',
  chain_id: 143,
  bucket_timezone: 'UTC',
  updated_through: '2026-11-16T16:02:44.000Z',
  source_watermark: {
    vault_accounting: {
      block_number: '122782198',
      block_timestamp: '2026-11-16T16:02:44.000Z',
    },
  },
  method: 'nav_difference',
  denomination: {
    asset: 'mUSD',
    decimals: 6,
  },
  ranges: [
    createRange('7d', [createBucket('2026-11-15T00:00:00.000Z', '10')], '10'),
    createRange(
      '30d',
      [
        createBucket('2026-10-18T00:00:00.000Z', '20'),
        createBucket('2026-11-15T00:00:00.000Z', '10'),
      ],
      '200',
    ),
    createRange('90d', [createBucket('2026-11-15T00:00:00.000Z', '10')], '30'),
    createRange(
      '180d',
      [
        createBucket('2026-01-01T00:00:00.000Z', '70'),
        createBucket('2026-11-15T00:00:00.000Z', '10'),
      ],
      '80',
    ),
    createRange(
      '365d',
      [
        createBucket('2026-01-01T00:00:00.000Z', '70'),
        createBucket('2026-10-18T00:00:00.000Z', '20'),
        createBucket('2026-11-15T00:00:00.000Z', '10'),
      ],
      '300',
    ),
  ],
};

const setHistoricalEarningsResult = ({
  data = historicalEarnings,
  isLoading = false,
  isError = false,
}: {
  data?: InterestHistoryResponse | null;
  isLoading?: boolean;
  isError?: boolean;
} = {}): void => {
  mockUseMoneyHistoricalEarnings.mockReturnValue({
    data,
    isLoading,
    isError,
    refetch: mockRefetchHistoricalEarnings,
  } as unknown as ReturnType<typeof useMoneyHistoricalEarnings>);
};

describe('MoneyEarningsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({ params: undefined });
    mockUseMoneyAccountWithdrawal.mockReturnValue({
      initiateWithdrawal: mockInitiateWithdrawal,
    } as unknown as ReturnType<typeof useMoneyAccountWithdrawal>);
    mockUseMoneyDepositNavigation.mockReturnValue({
      navigateToMoneyDeposit: mockNavigateToMoneyDeposit,
    });
    setHistoricalEarningsResult();
  });

  it('selects the Earnings tab when route params are missing', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <MoneyEarningsView />,
    );

    const earningsTab = getByTestId(MoneyEarningsViewTestIds.TAB_EARNINGS);

    expect(earningsTab.props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });
    const chart = getByTestId(MoneyEarningsViewTestIds.CHART);
    expect(chart).toBeOnTheScreen();
    expect(getByTestId(MoneyEarningsViewTestIds.HERO)).toBeOnTheScreen();
    expect(getByTestId(MoneyEarningsViewTestIds.HERO_TOTAL)).toHaveTextContent(
      '$300.00',
    );
    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_AMOUNT),
    ).toHaveTextContent('▲ $200.00');
    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_DATE),
    ).toHaveTextContent('· Oct 18 – Nov 15');
    expect(
      queryByText(strings('money.earnings.earned_last_30_days')),
    ).not.toBeOnTheScreen();
  });

  it('normalizes an unsupported route tab to Earnings', () => {
    mockUseRoute.mockReturnValue({ params: { activeTab: 'allocation' } });

    const { getByLabelText, getByTestId } = renderWithProvider(
      <MoneyEarningsView />,
    );

    const earningsTab = getByLabelText(strings('money.earnings.tab_earnings'));
    const apyTab = getByLabelText(strings('money.earnings.tab_apy'));
    const allocationTab = getByLabelText(
      strings('money.earnings.tab_allocation'),
    );

    expect(earningsTab.props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });
    expect(apyTab.props.accessibilityState).toEqual({
      selected: false,
      disabled: true,
    });
    expect(apyTab.props.onPress).toBeUndefined();
    expect(allocationTab.props.accessibilityState).toEqual({
      selected: false,
      disabled: true,
    });
    expect(allocationTab.props.onPress).toBeUndefined();
    expect(getByTestId(MoneyEarningsViewTestIds.CHART)).toBeOnTheScreen();
  });

  it('selects a different earnings range', () => {
    const { getByLabelText, getByTestId, getByText } = renderWithProvider(
      <MoneyEarningsView />,
    );

    fireEvent.press(getByLabelText(strings('money.earnings.range_1y')));

    expect(
      getByLabelText(strings('money.earnings.range_1y')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(getByTestId(MoneyEarningsViewTestIds.HERO_TOTAL)).toHaveTextContent(
      '$300.00',
    );
    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_AMOUNT),
    ).toHaveTextContent('▲ $300.00');
    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_DATE),
    ).toHaveTextContent('· Jan – Nov');
    expect(getByText('+$300.00')).toBeOnTheScreen();
  });

  it('formats non-zero sub-cent period earnings as less than one cent', () => {
    const subCentRange = createRange(
      '30d',
      [createBucket('2026-11-15T00:00:00.000Z', '0.001')],
      '0.001',
    );
    setHistoricalEarningsResult({
      data: {
        ...historicalEarnings,
        ranges: [
          ...historicalEarnings.ranges.filter(({ range }) => range !== '30d'),
          subCentRange,
        ],
      },
    });

    const { getByTestId } = renderWithProvider(<MoneyEarningsView />);

    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_AMOUNT),
    ).toHaveTextContent('▲ <$0.01');
  });

  it('uses default text color for zero period earnings', () => {
    const zeroRange = createRange(
      '30d',
      [createBucket('2026-11-15T00:00:00.000Z', '0')],
      '0',
    );
    setHistoricalEarningsResult({
      data: {
        ...historicalEarnings,
        ranges: [
          ...historicalEarnings.ranges.filter(({ range }) => range !== '30d'),
          zeroRange,
        ],
      },
    });

    const { getByTestId } = renderWithProvider(<MoneyEarningsView />);

    const periodAmount = getByTestId(
      MoneyEarningsViewTestIds.HERO_PERIOD_AMOUNT,
    );

    expect(periodAmount).toHaveTextContent('$0.00');
    expect(periodAmount).not.toHaveTextContent('▲');
    expect(periodAmount.props.color ?? TextColor.TextDefault).toBe(
      TextColor.TextDefault,
    );
  });

  it('displays the authoritative 30-day total in the summary', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEarningsView />,
    );

    expect(getByTestId(MoneyEarningsViewTestIds.SUMMARY)).toBeOnTheScreen();
    expect(getByText('+$200.00')).toBeOnTheScreen();
  });

  it('displays the one-year total as Lifetime', () => {
    const { getByText } = renderWithProvider(<MoneyEarningsView />);

    const lifetimeLabel = getByText(strings('money.earnings.lifetime'));

    expect(lifetimeLabel).toBeOnTheScreen();
    expect(getByText('+$300.00')).toBeOnTheScreen();
  });

  it('displays the projected annual value', () => {
    const { getByText } = renderWithProvider(<MoneyEarningsView />);

    const projectedLabel = getByText(
      strings('money.earnings.projected_in_1_year'),
    );

    expect(projectedLabel).toBeOnTheScreen();
    expect(getByText('+$2,400.00')).toBeOnTheScreen();
  });

  it('uses the exclusive range end for summary freshness', () => {
    const { getByText } = renderWithProvider(<MoneyEarningsView />);

    expect(
      getByText(
        strings('money.earnings.data_through', {
          date: 'Nov 16, 2026',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('displays a range error when selected range earnings are unavailable', () => {
    const unavailableRange: InterestHistoryRange = {
      ...createRange(
        '30d',
        [
          createBucket('2026-11-15T00:00:00.000Z', null, {
            earnings: 'unavailable',
            usd_pricing: 'unavailable',
          }),
        ],
        '0',
      ),
      availability: {
        earnings: 'unavailable',
        usd_pricing: 'unavailable',
      },
      totals: {
        interest_earned_musd_assets: null,
        interest_earned_usd: null,
      },
    };
    setHistoricalEarningsResult({
      data: {
        ...historicalEarnings,
        ranges: [
          ...historicalEarnings.ranges.filter(({ range }) => range !== '30d'),
          unavailableRange,
        ],
      },
    });

    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEarningsView />,
    );

    expect(getByTestId(MoneyEarningsViewTestIds.ERROR)).toBeOnTheScreen();
    expect(getByText(strings('money.earnings.error'))).toBeOnTheScreen();
  });

  it('displays loading state without a summary', () => {
    setHistoricalEarningsResult({ isLoading: true });

    const { getByLabelText, getByTestId, queryByTestId } = renderWithProvider(
      <MoneyEarningsView />,
    );

    expect(getByTestId(MoneyEarningsViewTestIds.LOADING)).toBeOnTheScreen();
    expect(
      getByLabelText(strings('money.earnings.range_1m')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();
  });

  it('displays error content and retries without a summary', () => {
    setHistoricalEarningsResult({ isError: true });

    const { getByText, queryByTestId } = renderWithProvider(
      <MoneyEarningsView />,
    );

    const errorMessage = getByText(strings('money.earnings.error'));
    const retryButton = getByText(strings('money.earnings.retry'));

    expect(errorMessage).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();

    fireEvent.press(retryButton);

    expect(mockRefetchHistoricalEarnings).toHaveBeenCalledTimes(1);
  });

  it('displays error content without a summary for malformed history', () => {
    setHistoricalEarningsResult({
      data: {
        ...historicalEarnings,
        ranges: [
          createRange(
            '30d',
            [
              {
                ...createBucket('2026-11-15T00:00:00.000Z', '1'),
                start: 'invalid',
              },
            ],
            '1',
          ),
        ],
      },
    });

    const { getByText, queryByTestId } = renderWithProvider(
      <MoneyEarningsView />,
    );

    expect(getByText(strings('money.earnings.error'))).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();
  });

  it('displays error content without a summary for null query data', () => {
    setHistoricalEarningsResult({ data: null });

    const { getByText, queryByTestId } = renderWithProvider(
      <MoneyEarningsView />,
    );

    expect(getByText(strings('money.earnings.error'))).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();
  });

  it('displays error content without a summary for non-finite bucket data', () => {
    setHistoricalEarningsResult({
      data: {
        ...historicalEarnings,
        ranges: [
          createRange(
            '30d',
            [createBucket('2026-11-15T00:00:00.000Z', 'Infinity')],
            '0',
          ),
        ],
      },
    });

    const { getByText, queryByTestId } = renderWithProvider(
      <MoneyEarningsView />,
    );

    expect(getByText(strings('money.earnings.error'))).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();
  });

  it('displays retryable error without a summary for projection overflow', () => {
    setHistoricalEarningsResult({
      data: {
        ...historicalEarnings,
        ranges: [
          createRange(
            '30d',
            [createBucket('2026-11-15T00:00:00.000Z', '1')],
            String(Number.MAX_VALUE),
          ),
        ],
      },
    });

    const { getByText, getByTestId, queryByText, queryByTestId } =
      renderWithProvider(<MoneyEarningsView />);

    expect(getByTestId(MoneyEarningsViewTestIds.ERROR)).toBeOnTheScreen();
    expect(getByText(strings('money.earnings.retry'))).toBeOnTheScreen();
    expect(queryByText(/Infinity/)).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();
  });

  it('displays empty state without a summary', () => {
    setHistoricalEarningsResult({
      data: {
        ...historicalEarnings,
        ranges: [createRange('30d', [], '0')],
      },
    });

    const { getByText, queryByTestId } = renderWithProvider(
      <MoneyEarningsView />,
    );

    expect(getByText(strings('money.earnings.empty'))).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();
  });

  it('starts withdrawal from the Withdraw action', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsView />);

    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.WITHDRAW_BUTTON));

    expect(mockInitiateWithdrawal).toHaveBeenCalledTimes(1);
  });

  it('opens deposit navigation from the Add action', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsView />);

    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.ADD_BUTTON));

    expect(mockNavigateToMoneyDeposit).toHaveBeenCalledTimes(1);
  });

  it('displays the no-lockups footer copy', () => {
    const { getByText } = renderWithProvider(<MoneyEarningsView />);

    expect(getByText(strings('money.earnings.no_lockups'))).toBeOnTheScreen();
  });
});
