import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import useMoneyAccountProjectedEarnings from '../../hooks/useMoneyAccountProjectedEarnings';
import { useMoneyHistoricalEarnings } from '../../hooks/useMoneyHistoricalEarnings';
import type {
  InterestHistoryAvailability,
  InterestHistoryBucket,
  InterestHistoryRange,
  InterestHistoryResponse,
} from '../../types/moneyInterestHistory';
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

jest.mock('../../hooks/useMoneyAccountProjectedEarnings', () => ({
  __esModule: true,
  default: jest.fn(),
}));

let mockIsMoneyBrandRefresh = false;
jest.mock(
  '../../../../../selectors/featureFlagController/moneyBrandRefresh',
  () => ({
    selectMoneyBrandRefreshEnabled: () => mockIsMoneyBrandRefresh,
  }),
);

const mockHeaderStandardGlassProps = jest.fn();
jest.mock(
  '../../../../../component-library/components-temp/HeaderStandardGlass',
  () => {
    const ReactActual = jest.requireActual('react');
    const ActualHeaderStandardGlass = jest.requireActual(
      '../../../../../component-library/components-temp/HeaderStandardGlass',
    ).default;

    return {
      __esModule: true,
      default: (props: Record<string, unknown>) => {
        mockHeaderStandardGlassProps(props);
        return ReactActual.createElement(ActualHeaderStandardGlass, props);
      },
    };
  },
);

const mockUseMoneyAccountWithdrawal = jest.mocked(useMoneyAccountWithdrawal);
const mockUseMoneyDepositNavigation = jest.mocked(useMoneyDepositNavigation);
const mockUseMoneyHistoricalEarnings = jest.mocked(useMoneyHistoricalEarnings);
const mockUseMoneyAccountProjectedEarnings = jest.mocked(
  useMoneyAccountProjectedEarnings,
);

const setProjectedEarningsResult = (
  result: Partial<ReturnType<typeof useMoneyAccountProjectedEarnings>> = {},
): void => {
  mockUseMoneyAccountProjectedEarnings.mockReturnValue({
    balanceFiat: 60000,
    apyDecimal: 0.04,
    projectedAmount: 2400,
    ...result,
  });
};

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
    mockIsMoneyBrandRefresh = false;
    mockUseRoute.mockReturnValue({ params: undefined });
    mockUseMoneyAccountWithdrawal.mockReturnValue({
      initiateWithdrawal: mockInitiateWithdrawal,
    } as unknown as ReturnType<typeof useMoneyAccountWithdrawal>);
    mockUseMoneyDepositNavigation.mockReturnValue({
      navigateToMoneyDeposit: mockNavigateToMoneyDeposit,
    });
    setHistoricalEarningsResult();
    setProjectedEarningsResult();
  });

  describe('header', () => {
    it('renders the plain header when brand refresh is disabled', () => {
      const { getByTestId } = renderWithProvider(<MoneyEarningsView />);

      expect(mockHeaderStandardGlassProps).toHaveBeenCalledWith(
        expect.objectContaining({
          isGlass: false,
          isFloating: false,
          includesTopInset: true,
        }),
      );
      expect(
        StyleSheet.flatten(
          getByTestId(MoneyEarningsViewTestIds.CONTAINER).props.style,
        ),
      ).not.toHaveProperty('paddingTop');
    });

    it('renders the glass header when brand refresh is enabled', () => {
      mockIsMoneyBrandRefresh = true;

      renderWithProvider(<MoneyEarningsView />);

      expect(mockHeaderStandardGlassProps).toHaveBeenCalledWith(
        expect.objectContaining({
          isGlass: true,
          isFloating: false,
          includesTopInset: true,
        }),
      );
    });
  });

  it('selects the Earnings tab when route params are missing', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsView />);

    const earningsTab = getByTestId(MoneyEarningsViewTestIds.TAB_EARNINGS);

    expect(earningsTab.props.accessibilityState.disabled).toBe(false);
  });

  it('normalizes an unsupported route tab to Earnings', () => {
    mockUseRoute.mockReturnValue({ params: { activeTab: 'allocation' } });

    const { getByTestId } = renderWithProvider(<MoneyEarningsView />);

    const earningsTab = getByTestId(MoneyEarningsViewTestIds.TAB_EARNINGS);
    const apyTab = getByTestId(MoneyEarningsViewTestIds.TAB_APY);
    const allocationTab = getByTestId(MoneyEarningsViewTestIds.TAB_ALLOCATION);

    expect(earningsTab.props.accessibilityState.disabled).toBe(false);
    expect(apyTab.props.accessibilityState.disabled).toBe(true);
    expect(apyTab.props.onPress).toBeUndefined();
    expect(allocationTab.props.accessibilityState.disabled).toBe(true);
    expect(allocationTab.props.onPress).toBeUndefined();
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
});
