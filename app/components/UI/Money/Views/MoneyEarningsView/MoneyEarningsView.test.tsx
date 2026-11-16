import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import {
  useMoneyHistoricalEarnings,
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

const historicalEarnings: InterestHistoryResponse = {
  address: '0x1234',
  chain_id: 143,
  history: [
    {
      timestamp: '2026-11-16T12:00:00.000Z',
      interest_earned_usd: '10',
    },
    {
      timestamp: '2026-10-18T12:00:00.000Z',
      interest_earned_usd: '20',
    },
    {
      timestamp: '2026-01-01T12:00:00.000Z',
      interest_earned_usd: '70',
    },
    {
      timestamp: '2025-11-16T12:00:00.000Z',
      interest_earned_usd: '900',
    },
  ],
};

const setHistoricalEarningsResult = ({
  data = historicalEarnings,
  isLoading = false,
  isError = false,
}: {
  data?: InterestHistoryResponse;
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
    const { getByTestId } = renderWithProvider(<MoneyEarningsView />);

    const earningsTab = getByTestId(MoneyEarningsViewTestIds.TAB_EARNINGS);

    expect(earningsTab.props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });
    expect(getByTestId(MoneyEarningsViewTestIds.CHART)).toBeOnTheScreen();
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
    const { getAllByText, getByLabelText } = renderWithProvider(
      <MoneyEarningsView />,
    );

    fireEvent.press(getByLabelText(strings('money.earnings.range_1y')));

    expect(
      getByLabelText(strings('money.earnings.range_1y')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(getAllByText('+$100.00')).toHaveLength(2);
  });

  it('displays the 30-day total in the hero and summary', () => {
    const { getAllByText } = renderWithProvider(<MoneyEarningsView />);

    const thirtyDayValues = getAllByText('+$30.00');

    expect(thirtyDayValues).toHaveLength(2);
    expect(thirtyDayValues[0]).toBeOnTheScreen();
    expect(thirtyDayValues[1]).toBeOnTheScreen();
  });

  it('displays the one-year total as Lifetime', () => {
    const { getByText } = renderWithProvider(<MoneyEarningsView />);

    const lifetimeLabel = getByText(strings('money.earnings.lifetime'));

    expect(lifetimeLabel).toBeOnTheScreen();
    expect(getByText('+$100.00')).toBeOnTheScreen();
  });

  it('displays the projected annual value', () => {
    const { getByText } = renderWithProvider(<MoneyEarningsView />);

    const projectedLabel = getByText(
      strings('money.earnings.projected_in_1_year'),
    );

    expect(projectedLabel).toBeOnTheScreen();
    expect(getByText('+$360.00')).toBeOnTheScreen();
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

  it('displays empty state without a summary', () => {
    setHistoricalEarningsResult({
      data: { ...historicalEarnings, history: [] },
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
});
